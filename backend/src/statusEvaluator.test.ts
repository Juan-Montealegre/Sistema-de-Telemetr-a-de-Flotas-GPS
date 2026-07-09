import { describe, it, expect } from 'vitest';
import { evaluateVehicleStatus } from './statusEvaluator.js';
import { Telemetry } from './types.js';

describe('evaluateVehicleStatus', () => {
  const baseTime = new Date('2026-07-09T12:00:00Z');

  it('should return "Sin señal" if history is empty', () => {
    expect(evaluateVehicleStatus([], baseTime)).toBe('Sin señal');
  });

  it('should return "Sin señal" if last seen was > 120 seconds ago', () => {
    const history: Telemetry[] = [
      {
        vehicle_id: 'VH-001',
        lat: 4.7110,
        lng: -74.0721,
        timestamp: new Date(baseTime.getTime() - 130_000).toISOString(),
      },
    ];
    expect(evaluateVehicleStatus(history, baseTime)).toBe('Sin señal');
  });

  it('should return "En movimiento" if different coordinates are received in the last 60 seconds', () => {
    const history: Telemetry[] = [
      {
        vehicle_id: 'VH-001',
        lat: 4.7110,
        lng: -74.0721,
        timestamp: new Date(baseTime.getTime() - 40_000).toISOString(),
      },
      {
        vehicle_id: 'VH-001',
        lat: 4.7115,
        lng: -74.0725,
        timestamp: new Date(baseTime.getTime() - 10_000).toISOString(),
      },
    ];
    expect(evaluateVehicleStatus(history, baseTime)).toBe('En movimiento');
  });

  it('should return "Detenido" if the vehicle has been at the same coordinate for > 60 seconds', () => {
    const history: Telemetry[] = [
      {
        vehicle_id: 'VH-001',
        lat: 4.7110,
        lng: -74.0721,
        timestamp: new Date(baseTime.getTime() - 70_000).toISOString(),
      },
      {
        vehicle_id: 'VH-001',
        lat: 4.7110,
        lng: -74.0721,
        timestamp: new Date(baseTime.getTime() - 10_000).toISOString(),
      },
    ];
    expect(evaluateVehicleStatus(history, baseTime)).toBe('Detenido');
  });

  it('should return "En movimiento" if the vehicle stopped less than 60 seconds ago', () => {
    const history: Telemetry[] = [
      {
        vehicle_id: 'VH-001',
        lat: 4.7100,
        lng: -74.0700,
        timestamp: new Date(baseTime.getTime() - 45_000).toISOString(),
      },
      {
        vehicle_id: 'VH-001',
        lat: 4.7110,
        lng: -74.0721,
        timestamp: new Date(baseTime.getTime() - 30_000).toISOString(),
      },
      {
        vehicle_id: 'VH-001',
        lat: 4.7110,
        lng: -74.0721,
        timestamp: new Date(baseTime.getTime() - 5_000).toISOString(),
      },
    ];
    // Stationary period started at -30_000 (30 seconds ago), which is <= 60 seconds, so it should still be En movimiento
    expect(evaluateVehicleStatus(history, baseTime)).toBe('En movimiento');
  });
});
