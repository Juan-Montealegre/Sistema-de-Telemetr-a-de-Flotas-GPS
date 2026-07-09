import React, { useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import { 
  Navigation, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  AlertTriangle, 
  Trash2, 
  Gauge, 
  ShieldAlert, 
  CheckCircle2, 
  Car 
} from 'lucide-react';

interface VehicleState {
  vehicle_id: string;
  last_lat: number;
  last_lng: number;
  last_seen: string;
  status: 'En movimiento' | 'Detenido' | 'Sin señal';
}

const BACKEND_REST_URL = 'http://localhost:3001';
const BACKEND_WS_URL = 'ws://localhost:3001';

export default function App() {
  const [vehicles, setVehicles] = useState<VehicleState[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'ws' | 'polling' | 'disconnected'>('disconnected');
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState<number>(0);

  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const wsRef = useRef<WebSocket | null>(null);
  const pollingIntervalRef = useRef<any>(null);

  // 1. Fetch data fallback
  const fetchVehiclesREST = async () => {
    try {
      const response = await fetch(`${BACKEND_REST_URL}/vehicles`);
      if (response.ok) {
        const data: VehicleState[] = await response.json();
        setVehicles(data);
        setSecondsSinceUpdate(0);
        if (connectionStatus !== 'ws') {
          setConnectionStatus('polling');
        }
      } else {
        throw new Error('Server returned non-200');
      }
    } catch (error) {
      console.error('Error fetching vehicles via REST:', error);
      setConnectionStatus('disconnected');
    }
  };

  // 2. WebSocket setup
  useEffect(() => {
    function connectWS() {
      console.log('Connecting to WebSocket...');
      const ws = new WebSocket(BACKEND_WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected!');
        setConnectionStatus('ws');
        // Clear any active REST polling interval if we successfully connect
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'INIT' || message.type === 'UPDATE') {
            setVehicles(message.vehicles);
            setSecondsSinceUpdate(0);
          }
        } catch (e) {
          console.error('Error parsing WS message:', e);
        }
      };

      ws.onclose = () => {
        console.warn('WebSocket connection closed. Switching to polling...');
        setConnectionStatus('polling');
        // Start HTTP polling
        if (!pollingIntervalRef.current) {
          fetchVehiclesREST();
          pollingIntervalRef.current = setInterval(fetchVehiclesREST, 5000);
        }
        // Attempt reconnect after 10 seconds
        setTimeout(() => {
          if (wsRef.current?.readyState === WebSocket.CLOSED) {
            connectWS();
          }
        }, 10000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        ws.close();
      };
    }

    connectWS();

    // Cleanup on unmount
    return () => {
      wsRef.current?.close();
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // 3. Counter increment
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsSinceUpdate((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 4. Initialize Map
  useEffect(() => {
    if (!mapRef.current) {
      // Bogota coordinates
      const map = L.map('map', {
        zoomControl: false,
        attributionControl: false
      }).setView([4.6700, -74.0800], 12);

      // Google Maps style high-detail street map tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);

      // Put zoom control in top right
      L.control.zoom({ position: 'topright' }).addTo(map);

      mapRef.current = map;
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // 5. Update Map Markers
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    const activeIds = new Set<string>();

    vehicles.forEach((vehicle) => {
      activeIds.add(vehicle.vehicle_id);

      const latLng: L.LatLngExpression = [vehicle.last_lat, vehicle.last_lng];
      const statusClass = 
        vehicle.status === 'En movimiento' ? 'moving' : 
        vehicle.status === 'Detenido' ? 'stopped' : 'nosignal';

      // Create Custom HTML Pin with floating text label
      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div class="custom-pin-wrapper">
            <div class="custom-pin ${statusClass}">
              <div class="custom-pin-inner"></div>
            </div>
            <div class="custom-pin-label">${vehicle.vehicle_id}</div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const popupContent = `
        <div class="popup-details">
          <div class="popup-title">${vehicle.vehicle_id}</div>
          <div class="popup-row">
            <span class="popup-label">Estado:</span>
            <span class="popup-value" style="color: var(--status-${statusClass})">${vehicle.status}</span>
          </div>
          <div class="popup-row">
            <span class="popup-label">Latitud:</span>
            <span class="popup-value">${vehicle.last_lat.toFixed(5)}</span>
          </div>
          <div class="popup-row">
            <span class="popup-label">Longitud:</span>
            <span class="popup-value">${vehicle.last_lng.toFixed(5)}</span>
          </div>
          <div class="popup-row">
            <span class="popup-label">Visto hace:</span>
            <span class="popup-value">${new Date(vehicle.last_seen).toLocaleTimeString()}</span>
          </div>
        </div>
      `;

      if (markersRef.current.has(vehicle.vehicle_id)) {
        // Update marker position, icon, and popup content
        const marker = markersRef.current.get(vehicle.vehicle_id)!;
        marker.setLatLng(latLng);
        marker.setIcon(customIcon);
        marker.setPopupContent(popupContent);
      } else {
        // Create new marker
        const marker = L.marker(latLng, { icon: customIcon })
          .addTo(map)
          .bindPopup(popupContent);

        marker.on('click', () => {
          setSelectedVehicleId(vehicle.vehicle_id);
        });

        markersRef.current.set(vehicle.vehicle_id, marker);
      }
    });

    // Remove deleted markers
    markersRef.current.forEach((marker, id) => {
      if (!activeIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });
  }, [vehicles]);

  // Center map on selected vehicle
  const handleSelectVehicle = (vehicle: VehicleState) => {
    setSelectedVehicleId(vehicle.vehicle_id);
    if (mapRef.current) {
      mapRef.current.setView([vehicle.last_lat, vehicle.last_lng], 14, {
        animate: true,
        duration: 0.8
      });
      // Find and open popup
      const marker = markersRef.current.get(vehicle.vehicle_id);
      if (marker) {
        marker.openPopup();
      }
    }
  };

  // Delete vehicle call
  const handleDeleteVehicle = async (e: React.MouseEvent, vehicleId: string) => {
    e.stopPropagation();
    if (!confirm(`¿Está seguro de eliminar el vehículo ${vehicleId}?`)) {
      return;
    }

    try {
      const response = await fetch(`${BACKEND_REST_URL}/vehicles/${vehicleId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        // Optimistic UI update or wait for WS broadcast (REST client will fallback or WS will auto-push)
        setVehicles((prev) => prev.filter((v) => v.vehicle_id !== vehicleId));
        if (selectedVehicleId === vehicleId) {
          setSelectedVehicleId(null);
        }
      } else {
        alert('No se pudo eliminar el vehículo.');
      }
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      alert('Error de conexión al eliminar el vehículo.');
    }
  };

  // KPI Calculations
  const totalVehicles = vehicles.length;
  const movingVehicles = vehicles.filter(v => v.status === 'En movimiento').length;
  const stoppedVehicles = vehicles.filter(v => v.status === 'Detenido').length;
  const nosignalVehicles = vehicles.filter(v => v.status === 'Sin señal').length;

  return (
    <div className="app-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="title-section">
          <h1>SISTEMA DE TELEMETRÍA FLOTA GPS</h1>
          <p>Monitoreo y cálculo de estados de vehículos en tiempo real</p>
        </div>
        <div className="status-bar">
          <span className="update-time">
            Última actualización: hace {secondsSinceUpdate}s
          </span>
          {connectionStatus === 'ws' && (
            <div className="conn-badge ws">
              <Wifi size={16} /> WebSockets Live
            </div>
          )}
          {connectionStatus === 'polling' && (
            <div className="conn-badge polling">
              <RefreshCw size={16} /> HTTP Polling (5s)
            </div>
          )}
          {connectionStatus === 'disconnected' && (
            <div className="conn-badge disconnected">
              <WifiOff size={16} /> Desconectado
            </div>
          )}
        </div>
      </header>

      {/* KPIs */}
      <section className="kpi-container">
        <div className="kpi-card glass-panel">
          <div className="kpi-icon">
            <Car size={24} style={{ color: '#ffffff' }} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Vehículos Totales</span>
            <span className="kpi-value">{totalVehicles}</span>
          </div>
        </div>

        <div className="kpi-card glass-panel" style={{ borderLeft: '3px solid var(--status-moving)' }}>
          <div className="kpi-icon">
            <Gauge size={24} style={{ color: 'var(--status-moving)' }} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">En Movimiento</span>
            <span className="kpi-value" style={{ color: 'var(--status-moving)' }}>{movingVehicles}</span>
          </div>
        </div>

        <div className="kpi-card glass-panel" style={{ borderLeft: '3px solid var(--status-stopped)' }}>
          <div className="kpi-icon">
            <CheckCircle2 size={24} style={{ color: 'var(--status-stopped)' }} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Detenidos</span>
            <span className="kpi-value" style={{ color: 'var(--status-stopped)' }}>{stoppedVehicles}</span>
          </div>
        </div>

        <div className="kpi-card glass-panel" style={{ borderLeft: '3px solid var(--status-nosignal)' }}>
          <div className="kpi-icon">
            <ShieldAlert size={24} style={{ color: 'var(--status-nosignal)' }} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Sin Señal</span>
            <span className="kpi-value" style={{ color: 'var(--status-nosignal)' }}>{nosignalVehicles}</span>
          </div>
        </div>
      </section>

      {/* Main Workspace */}
      <main className="main-workspace">
        {/* Vehicles list sidebar */}
        <section className="vehicles-panel glass-panel">
          <div className="panel-header">
            <h2>Vehículos Registrados</h2>
            <span className="update-time" style={{ fontSize: '0.75rem' }}>
              Total: {vehicles.length}
            </span>
          </div>

          <div className="vehicles-list">
            {vehicles.length === 0 ? (
              <div className="empty-state">
                <AlertTriangle size={32} style={{ color: 'var(--text-muted)' }} />
                <h3>No hay datos</h3>
                <p>Encienda el simulador para empezar a recibir datos de telemetría.</p>
              </div>
            ) : (
              vehicles.map((vehicle) => {
                const isSelected = selectedVehicleId === vehicle.vehicle_id;
                const statusClass = 
                  vehicle.status === 'En movimiento' ? 'moving' : 
                  vehicle.status === 'Detenido' ? 'stopped' : 'nosignal';

                return (
                  <div
                    key={vehicle.vehicle_id}
                    className={`vehicle-card glass-panel ${statusClass} ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectVehicle(vehicle)}
                  >
                    <div className="card-top">
                      <span className="vehicle-id">
                        <Navigation 
                          size={14} 
                          style={{ 
                            transform: 'rotate(45deg)', 
                            color: isSelected ? 'var(--status-moving)' : 'var(--text-muted)' 
                          }} 
                        />
                        {vehicle.vehicle_id}
                      </span>
                      <span className={`status-badge ${statusClass}`}>
                        {vehicle.status}
                      </span>
                    </div>

                    <div className="card-middle">
                      <div>Lat: {vehicle.last_lat.toFixed(5)}</div>
                      <div>Lng: {vehicle.last_lng.toFixed(5)}</div>
                    </div>

                    <div className="card-bottom">
                      <span>Visto: {new Date(vehicle.last_seen).toLocaleTimeString()}</span>
                      <button
                        className="delete-btn"
                        onClick={(e) => handleDeleteVehicle(e, vehicle.vehicle_id)}
                        title="Eliminar vehículo"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Map panel */}
        <section className="map-panel glass-panel">
          <div id="map"></div>
        </section>
      </main>
    </div>
  );
}
