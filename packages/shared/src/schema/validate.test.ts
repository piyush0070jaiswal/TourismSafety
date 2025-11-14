import { describe, it, expect } from 'vitest';
import { validateTelemetry } from './validate';

describe('validateTelemetry', () => {
  it('accepts a valid payload', () => {
    const payload = {
      deviceId: '550e8400-e29b-41d4-a716-446655440000',
      ts: '2025-09-19T12:34:56.789Z',
      lat: 19.076,
      lon: 72.8777,
      hr: 108,
      accel: [0.01, 1.02, -0.03],
      sos: false,
      battery: 0.56,
      sig: 'MEUCIQDN+'
    };
    const { ok, errors } = validateTelemetry(payload);
    expect(ok).toBe(true);
    expect(errors).toBeUndefined();
  });

  it('rejects out-of-range coords', () => {
    const bad = { deviceId: '550e8400-e29b-41d4-a716-446655440000', ts: '2025-09-19T12:00:00Z', lat: -91, lon: 181 };
    const { ok, errors } = validateTelemetry(bad);
    expect(ok).toBe(false);
    expect(errors && errors.length).toBeGreaterThan(0);
  });

  it('requires core fields', () => {
    const bad = { hr: 90 } as any;
    const { ok } = validateTelemetry(bad);
    expect(ok).toBe(false);
  });
});
