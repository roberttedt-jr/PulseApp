import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { haversineMeters } from "./use-gps-tracker.ts";

describe("Pulse Ultra v1 — GPS Math & Haversine", () => {
  it("calculates accurate distance between known coordinates", () => {
    // Madrid Puerta del Sol (40.4168, -3.7038) to Retiro Puerta de Alcalá (40.4200, -3.6887)
    // Distance is approximately 1.32 km (1320 meters)
    const d = haversineMeters(40.4168, -3.7038, 40.4200, -3.6887);
    assert.ok(d > 1250 && d < 1400, `Calculated distance ${d} should be around 1320m`);
  });

  it("returns zero for identical coordinates", () => {
    const d = haversineMeters(40.4168, -3.7038, 40.4168, -3.7038);
    assert.equal(d, 0);
  });

  it("calculates small movements accurately", () => {
    // Approx 11 meters displacement in latitude (0.0001 deg lat ~ 11.1 meters)
    const d = haversineMeters(40.4168, -3.7038, 40.4169, -3.7038);
    assert.ok(d > 10 && d < 12, `Calculated distance ${d} should be around 11.1m`);
  });
});
