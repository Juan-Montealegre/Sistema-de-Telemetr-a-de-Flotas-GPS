import { Telemetry } from './types.js';

/**
 * Calculates the state of a vehicle based on its telemetry history.
 *
 * Rules:
 * - Sin señal: No telemetry received in the last 120 seconds.
 * - Detenido: Same coordinate without changes for more than 60 seconds (1 minute).
 * - En movimiento: Different coordinates received in the last 60 seconds.
 */
export function evaluateVehicleStatus(
  history: Telemetry[],
  now: Date = new Date()
): 'En movimiento' | 'Detenido' | 'Sin señal' {
  if (!history || history.length === 0) {
    return 'Sin señal';
  }

  // Sort history by timestamp ascending to ensure correct temporal order
  const sortedHistory = [...history].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const latest = sortedHistory[sortedHistory.length - 1];
  const lastSeenTime = new Date(latest.timestamp).getTime();
  const nowTime = now.getTime();

  // 1. "Sin señal" if no data received for more than 120 seconds
  if (nowTime - lastSeenTime > 120_000) {
    return 'Sin señal';
  }

  // 2. Determine "Detenido" vs "En movimiento"
  // Find the sequence of contiguous matching coordinates from the end backwards.
  // This tells us how long the vehicle has been stationary at the current point.
  const latestLat = latest.lat;
  const latestLng = latest.lng;

  // Let's go backwards and find the first telemetry that differs from the latest,
  // or the oldest telemetry in the consecutive chain of identical coordinates.
  let firstSeenAtCurrentCoordTime = lastSeenTime;

  for (let i = sortedHistory.length - 1; i >= 0; i--) {
    const item = sortedHistory[i];
    // Check if coordinates are matching (using a small epsilon to tolerate minute float differences, though exact is fine for simulation)
    const isSameCoordinate =
      Math.abs(item.lat - latestLat) < 0.00001 &&
      Math.abs(item.lng - latestLng) < 0.00001;

    if (isSameCoordinate) {
      firstSeenAtCurrentCoordTime = new Date(item.timestamp).getTime();
    } else {
      // Found a different coordinate, so the stationary period started after this point
      break;
    }
  }

  // If the vehicle has been at the same coordinates for more than 60 seconds, it's Detenido
  const stationaryDuration = nowTime - firstSeenAtCurrentCoordTime;
  if (stationaryDuration > 60_000) {
    return 'Detenido';
  }

  // Otherwise, it is En movimiento
  return 'En movimiento';
}
