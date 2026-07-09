export interface Telemetry {
  vehicle_id: string;
  lat: number;
  lng: number;
  timestamp: string; // ISO 8601 string as received
}

export interface VehicleState {
  vehicle_id: string;
  last_lat: number;
  last_lng: number;
  last_seen: string; // ISO 8601 string
  status: 'En movimiento' | 'Detenido' | 'Sin señal';
}
