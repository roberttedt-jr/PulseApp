import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { healthkitAvailableOnWeb, HEALTHKIT_METRICS } from "./healthkit.ts";

describe("healthkit web gate", () => {
  it("never claims HealthKit is available in a PWA", () => {
    assert.equal(healthkitAvailableOnWeb(), false);
  });

  it("lists the native metrics a future iOS app could sync", () => {
    assert.deepEqual(
      HEALTHKIT_METRICS.map((m) => m.id),
      ["workouts", "activeEnergy", "heartRate", "bodyMass", "steps"],
    );
  });
});
