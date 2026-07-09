const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001/gps';

// Waypoint coordinates representing actual major roads in Bogotá
const ROUTES = {
  // Avenida Boyacá (North to South)
  boyaca: [
    [4.7505, -74.0780],
    [4.7380, -74.0845],
    [4.7265, -74.0920],
    [4.7160, -74.0980],
    [4.7040, -74.1030],
    [4.6930, -74.1080],
    [4.6750, -74.1130],
    [4.6600, -74.1170],
    [4.6465, -74.1205],
    [4.6300, -74.1285],
    [4.6140, -74.1370],
    [4.5950, -74.1480]
  ],
  // Autopista Norte / Avenida Caracas (North to South)
  norte_caracas: [
    [4.7570, -74.0455],
    [4.7410, -74.0490],
    [4.7240, -74.0535],
    [4.6860, -74.0585],
    [4.6675, -74.0615],
    [4.6600, -74.0620],
    [4.6320, -74.0670],
    [4.6150, -74.0700],
    [4.6015, -74.0730],
    [4.5950, -74.0740]
  ],
  // Avenida El Dorado (Calle 26 - East to West)
  calle26: [
    [4.6150, -74.0700],
    [4.6240, -74.0815],
    [4.6290, -74.0900],
    [4.6360, -74.0980],
    [4.6490, -74.1085],
    [4.6600, -74.1170],
    [4.6730, -74.1250],
    [4.6930, -74.1375]
  ],
  // Avenida NQS / Carrera 30 (North-East to South-West)
  nqs: [
    [4.6860, -74.0585],
    [4.6720, -74.0610],
    [4.6580, -74.0700],
    [4.6475, -74.0780],
    [4.6240, -74.0815],
    [4.6140, -74.0890],
    [4.6000, -74.1020],
    [4.5880, -74.1120],
    [4.5930, -74.1360]
  ],
  // Avenida Ciudad de Cali
  cali: [
    [4.7430, -74.0970],
    [4.7180, -74.1060],
    [4.7000, -74.1155],
    [4.6820, -74.1220],
    [4.6730, -74.1250],
    [4.6640, -74.1285],
    [4.6340, -74.1430],
    [4.6155, -74.1560]
  ]
};

// Generates smooth steps along the roads
function generateRoutePoints(waypoints, stepsPerLeg = 40) {
  const points = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const start = waypoints[i];
    const end = waypoints[i + 1];
    for (let step = 0; step < stepsPerLeg; step++) {
      const t = step / stepsPerLeg;
      const lat = start[0] + (end[0] - start[0]) * t;
      const lng = start[1] + (end[1] - start[1]) * t;
      points.push({ lat, lng });
    }
  }
  points.push({ lat: waypoints[waypoints.length - 1][0], lng: waypoints[waypoints.length - 1][1] });
  return points;
}

const vehicles = [
  {
    id: 'VH-001',
    route: generateRoutePoints(ROUTES.boyaca, 40),
    routeIndex: 0,
    direction: 1, // 1 forward, -1 backward
    static: false,
    lat: ROUTES.boyaca[0][0],
    lng: ROUTES.boyaca[0][1]
  },
  {
    id: 'VH-002', // Static vehicle to test "Detenido" status
    route: generateRoutePoints(ROUTES.norte_caracas, 40),
    routeIndex: 90,
    direction: 1,
    static: true, // Will stay completely static at NQS
    lat: ROUTES.norte_caracas[2][0],
    lng: ROUTES.norte_caracas[2][1]
  },
  {
    id: 'VH-003',
    route: generateRoutePoints(ROUTES.calle26, 40),
    routeIndex: 0,
    direction: 1,
    static: false,
    lat: ROUTES.calle26[0][0],
    lng: ROUTES.calle26[0][1]
  },
  {
    id: 'VH-004',
    route: generateRoutePoints(ROUTES.nqs, 40),
    routeIndex: 0,
    direction: 1,
    static: false,
    lat: ROUTES.nqs[0][0],
    lng: ROUTES.nqs[0][1]
  },
  {
    id: 'VH-005',
    route: generateRoutePoints(ROUTES.cali, 40),
    routeIndex: 0,
    direction: 1,
    static: false,
    isSignalDropTest: true, // Will simulate signal dropping (stops sending data periodically)
    lat: ROUTES.cali[0][0],
    lng: ROUTES.cali[0][1]
  }
];

function getRandomInterval(min = 3000, max = 5000) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function updateCoordinates(vehicle) {
  if (vehicle.static) {
    return; // Stay at same lat/lng
  }

  // Move along the route list
  vehicle.routeIndex += vehicle.direction;

  // Reverse direction if we hit route boundaries
  if (vehicle.routeIndex >= vehicle.route.length) {
    vehicle.routeIndex = vehicle.route.length - 1;
    vehicle.direction = -1;
  } else if (vehicle.routeIndex < 0) {
    vehicle.routeIndex = 0;
    vehicle.direction = 1;
  }

  // Set new coordinates exactly along the road path
  const currentPos = vehicle.route[vehicle.routeIndex];
  
  // No GPS noise is added here to ensure the vehicle stays 100% on the road
  vehicle.lat = currentPos.lat;
  vehicle.lng = currentPos.lng;
}

async function sendTelemetry(vehicle) {
  // Determine if this transmission should be invalid (~10% probability)
  const isInvalid = Math.random() < 0.10;
  
  let payload;
  let invalidReason = '';

  if (isInvalid) {
    // Generate one of 4 types of invalid payloads
    const invalidType = Math.floor(Math.random() * 4);
    switch (invalidType) {
      case 0:
        // Faltante vehicle_id
        payload = {
          lat: vehicle.lat,
          lng: vehicle.lng,
          timestamp: new Date().toISOString()
        };
        invalidReason = 'Missing vehicle_id';
        break;
      case 1:
        // Lat fuera de rango
        payload = {
          vehicle_id: vehicle.id,
          lat: 120.0, // Out of -90 to 90 range
          lng: vehicle.lng,
          timestamp: new Date().toISOString()
        };
        invalidReason = 'Lat out of range (120.0)';
        break;
      case 2:
        // Lng fuera de rango
        payload = {
          vehicle_id: vehicle.id,
          lat: vehicle.lat,
          lng: -200.0, // Out of -180 to 180 range
          timestamp: new Date().toISOString()
        };
        invalidReason = 'Lng out of range (-200.0)';
        break;
      case 3:
        // Timestamp inválido
        payload = {
          vehicle_id: vehicle.id,
          lat: vehicle.lat,
          lng: vehicle.lng,
          timestamp: 'this-is-not-a-date'
        };
        invalidReason = 'Invalid ISO timestamp';
        break;
    }
  } else {
    // Normal payload
    payload = {
      vehicle_id: vehicle.id,
      lat: Number(vehicle.lat.toFixed(6)),
      lng: Number(vehicle.lng.toFixed(6)),
      timestamp: new Date().toISOString()
    };
  }

  try {
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const status = response.status;
    const bodyText = await response.text();

    if (isInvalid) {
      console.log(`[Simulator] Send INVALID payload for ${vehicle.id} (${invalidReason}). Response: HTTP ${status} - ${bodyText}`);
    } else {
      console.log(`[Simulator] Send VALID telemetry for ${vehicle.id}: [${payload.lat}, ${payload.lng}]. Response: HTTP ${status}`);
    }
  } catch (error) {
    console.error(`[Simulator] Error sending telemetry for ${vehicle.id}: ${error.message}`);
  }
}

function startVehicleSimulation(vehicle) {
  let isTransmitting = true;

  // If designated as signal drop test, cycle between transmitting and suspended states
  if (vehicle.isSignalDropTest) {
    const cycleSignal = () => {
      isTransmitting = !isTransmitting;
      console.log(`[Simulator] Telemetry signal for ${vehicle.id} is now ${isTransmitting ? 'ONLINE (Sending coordinates)' : 'OFFLINE (Signal Lost - Sin Señal will appear after 120s)'}`);
      // When online: send data for 20 seconds, then drop again
      // When offline: stay silent for 180 seconds (120s to trigger Sin señal + 60s visible in red)
      setTimeout(cycleSignal, isTransmitting ? 20000 : 180000);
    };
    // Start the first drop after just 15 seconds so the user sees it quickly
    setTimeout(cycleSignal, 15000);
  }

  const run = async () => {
    if (isTransmitting) {
      updateCoordinates(vehicle);
      await sendTelemetry(vehicle);
    }
    setTimeout(run, getRandomInterval());
  };
  run();
}

console.log('Starting Telemetry Simulator...');
console.log('Simulating 5 vehicles moving along main Bogotá highways in real-time:');
console.log('- VH-001 (Av. Boyacá)');
console.log('- VH-002 (Av. Caracas - Detenido)');
console.log('- VH-003 (Calle 26)');
console.log('- VH-004 (Av. NQS / Carrera 30)');
console.log('- VH-005 (Av. Ciudad de Cali)');
console.log('Injecting ~10% invalid payloads for testing.');

vehicles.forEach(startVehicleSimulation);
