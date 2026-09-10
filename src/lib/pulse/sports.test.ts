import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SPORTS_CATALOG,
  getSportMeta,
  getSportsByCategory,
  formatPace,
  formatSpeed,
  formatDistance,
  formatElevation,
} from "./sports.ts";

describe("Pulse Ultra v1 — Sports Catalog Taxonomy", () => {
  it("includes all requested sport categories and sports", () => {
    assert.ok(SPORTS_CATALOG.length >= 15);
    const ids = SPORTS_CATALOG.map((s) => s.id);
    // Foot sports
    assert.ok(ids.includes("run"));
    assert.ok(ids.includes("trail_run"));
    assert.ok(ids.includes("walk"));
    assert.ok(ids.includes("hike"));
    // Cycle sports
    assert.ok(ids.includes("ride"));
    assert.ok(ids.includes("mtb"));
    assert.ok(ids.includes("gravel"));
    assert.ok(ids.includes("ebike"));
    // Strength sports
    assert.ok(ids.includes("weight_training"));
    assert.ok(ids.includes("bodybuilding"));
    assert.ok(ids.includes("calisthenics"));
    assert.ok(ids.includes("functional"));
    // Water & racket
    assert.ok(ids.includes("swim"));
    assert.ok(ids.includes("padel"));
    assert.ok(ids.includes("tennis"));
    assert.ok(ids.includes("yoga"));
  });

  it("classifies GPS capability correctly", () => {
    const run = getSportMeta("run");
    assert.equal(run.isGpsCapable, true);
    assert.equal(run.isStrength, false);

    const weights = getSportMeta("weight_training");
    assert.equal(weights.isGpsCapable, false);
    assert.equal(weights.isStrength, true);

    const ride = getSportMeta("ride");
    assert.equal(ride.isGpsCapable, true);
  });

  it("filters sports by category", () => {
    const footSports = getSportsByCategory("foot");
    assert.ok(footSports.length >= 4);
    assert.ok(footSports.every((s) => s.category === "foot"));

    const cycleSports = getSportsByCategory("cycle");
    assert.ok(cycleSports.length >= 4);
    assert.ok(cycleSports.every((s) => s.category === "cycle"));
  });

  it("formats pace cleanly (min/km)", () => {
    assert.equal(formatPace(285), "4:45 /km");
    assert.equal(formatPace(300), "5:00 /km");
    assert.equal(formatPace(0), "--:--");
    assert.equal(formatPace(-10), "--:--");
  });

  it("formats speed cleanly (km/h)", () => {
    assert.equal(formatSpeed(24.56), "24.6 km/h");
    assert.equal(formatSpeed(0), "0.0 km/h");
  });

  it("formats distance cleanly for metric and imperial", () => {
    assert.equal(formatDistance(5420, "metric"), "5,42 km");
    assert.equal(formatDistance(10000, "metric"), "10,00 km");
    assert.equal(formatDistance(1609.344, "imperial"), "1.00 mi");
  });

  it("formats elevation gain cleanly", () => {
    assert.equal(formatElevation(156.4), "+156 m");
    assert.equal(formatElevation(0), "+0 m");
  });
});
