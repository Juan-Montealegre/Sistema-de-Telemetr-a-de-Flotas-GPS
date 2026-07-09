import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { Telemetry, VehicleState } from './types.js';
import { evaluateVehicleStatus } from './statusEvaluator.js';

const app = express();
app.use(cors());
app.use(express.json());

// In-memory database of telemetries per vehicle
const telemetryDB = new Map<string, Telemetry[]>();

// Set up server
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Helper to calculate status of a single vehicle
function getVehicleState(vehicleId: string, history: Telemetry[], now: Date = new Date()): VehicleState {
  const latest = history[history.length - 1];
  const status = evaluateVehicleStatus(history, now);

  return {
    vehicle_id: vehicleId,
    last_lat: latest.lat,
    last_lng: latest.lng,
    last_seen: latest.timestamp,
    status
  };
}

// Helper to get all vehicle states
function getAllVehicleStates(now: Date = new Date()): VehicleState[] {
  const states: VehicleState[] = [];
  for (const [vehicleId, history] of telemetryDB.entries()) {
    if (history.length > 0) {
      states.push(getVehicleState(vehicleId, history, now));
    }
  }
  return states;
}

// Helper to broadcast current states to all WebSocket clients
function broadcastVehicleStates() {
  const data = JSON.stringify({
    type: 'UPDATE',
    vehicles: getAllVehicleStates()
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

// WebSocket Connection handler
wss.on('connection', (ws) => {
  console.log('WebSocket client connected');

  // Send initial data immediately
  ws.send(JSON.stringify({
    type: 'INIT',
    vehicles: getAllVehicleStates()
  }));

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});

// REST API Endpoints

// 1. Ingest coordinates: POST /gps
app.post('/gps', (req, res) => {
  const { vehicle_id, lat, lng, timestamp } = req.body;

  // Validation
  if (vehicle_id === undefined || typeof vehicle_id !== 'string' || vehicle_id.trim() === '') {
    return res.status(400).json({ error: "El campo 'vehicle_id' es obligatorio y debe ser una cadena no vacía." });
  }

  if (lat === undefined || typeof lat !== 'number' || lat < -90 || lat > 90) {
    return res.status(400).json({ error: "El campo 'lat' es obligatorio y debe estar en el rango de -90 a 90." });
  }

  if (lng === undefined || typeof lng !== 'number' || lng < -180 || lng > 180) {
    return res.status(400).json({ error: "El campo 'lng' es obligatorio y debe estar en el rango de -180 a 180." });
  }

  if (timestamp === undefined || typeof timestamp !== 'string') {
    return res.status(400).json({ error: "El campo 'timestamp' es obligatorio y debe ser un string." });
  }

  // Validate ISO 8601 Date
  const parsedDate = new Date(timestamp);
  if (isNaN(parsedDate.getTime())) {
    return res.status(400).json({ error: "El campo 'timestamp' debe ser una fecha/hora válida en formato ISO 8601." });
  }

  // Add telemetry
  const newTelemetry: Telemetry = {
    vehicle_id,
    lat,
    lng,
    timestamp
  };

  if (!telemetryDB.has(vehicle_id)) {
    telemetryDB.set(vehicle_id, []);
  }

  const history = telemetryDB.get(vehicle_id)!;
  history.push(newTelemetry);

  // Keep history clean (e.g. only keep last 100 entries to prevent memory leaks)
  if (history.length > 100) {
    history.shift();
  }

  // Broadcast updates to clients
  broadcastVehicleStates();

  return res.status(201).json({ message: 'Coordenada almacenada con éxito' });
});

// 2. Query vehicles: GET /vehicles
app.get('/vehicles', (req, res) => {
  const vehicles = getAllVehicleStates();
  return res.status(200).json(vehicles);
});

// 3. Query single vehicle: GET /vehicles/:id
app.get('/vehicles/:id', (req, res) => {
  const vehicleId = req.params.id;
  const history = telemetryDB.get(vehicleId);

  if (!history || history.length === 0) {
    return res.status(404).json({ error: `Vehículo con ID ${vehicleId} no encontrado.` });
  }

  const state = getVehicleState(vehicleId, history);
  return res.status(200).json(state);
});

// 4. Delete vehicle: DELETE /vehicles/:id
app.delete('/vehicles/:id', (req, res) => {
  const vehicleId = req.params.id;

  if (!telemetryDB.has(vehicleId)) {
    return res.status(404).json({ error: `Vehículo con ID ${vehicleId} no encontrado.` });
  }

  telemetryDB.delete(vehicleId);

  // Broadcast updates
  broadcastVehicleStates();

  return res.status(200).json({ message: `Vehículo ${vehicleId} eliminado con éxito.` });
});

// Serve port setup
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});

// Periodically broadcast vehicle states to handle passive state updates (e.g. "Sin señal")
setInterval(() => {
  broadcastVehicleStates();
}, 5000);
