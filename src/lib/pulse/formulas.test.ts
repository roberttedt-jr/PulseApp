import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ageFromBirthDate,
  bmi,
  bmiLabel,
  epley1rm,
  mifflinStJeor,
  platesFor,
  pulseScore,
  recommendedCalories,
  sessionVolume,
} from "./formulas.ts";

describe("epley1rm", () => {
  it("returns the working weight for a true single", () => {
    assert.equal(epley1rm(100, 1), 100);
  });
  it("estimates 1RM from a 5-rep set", () => {
    assert.equal(epley1rm(100, 5), 100 * (1 + 5 / 30));
  });
  it("returns 0 for invalid input", () => {
    assert.equal(epley1rm(0, 5), 0);
    assert.equal(epley1rm(80, 0), 0);
  });
});

describe("bmi", () => {
  it("computes a healthy BMI for 80kg at 180cm", () => {
    const value = bmi(80, 180);
    assert.ok(Math.abs(value - 24.69) < 0.02);
    assert.equal(bmiLabel(value), "Saludable");
  });
  it("labels the standard WHO bands", () => {
    assert.equal(bmiLabel(17), "Bajo peso");
    assert.equal(bmiLabel(27), "Sobrepeso");
    assert.equal(bmiLabel(32), "Obesidad");
  });
});

describe("mifflinStJeor", () => {
  it("matches the male formula", () => {
    assert.equal(mifflinStJeor({ weightKg: 80, heightCm: 180, ageYears: 30, sex: "male" }), 1780);
  });
  it("matches the female formula", () => {
    assert.equal(mifflinStJeor({ weightKg: 65, heightCm: 165, ageYears: 28, sex: "female" }), 1380.25);
  });
});

describe("recommendedCalories", () => {
  it("adds a surplus when the goal is hypertrophy", () => {
    assert.equal(recommendedCalories(1780, "gain"), Math.round(1780 * 1.55 + 300));
  });
  it("applies a deficit when the goal is fat loss", () => {
    assert.equal(recommendedCalories(1780, "lose"), Math.round(1780 * 1.55 - 400));
  });
});

describe("sessionVolume", () => {
  it("sums completed sets only", () => {
    assert.equal(
      sessionVolume([
        { weight: 100, reps: 5, completed: true },
        { weight: 80, reps: 8, completed: false },
      ]),
      500,
    );
  });
});

describe("pulseScore", () => {
  it("caps at 100", () => {
    assert.equal(pulseScore({ workoutsThisWeek: 7, weeklyGoal: 4, volumeThisWeek: 20000, streakDays: 20 }), 100);
  });
  it("returns 0 when idle", () => {
    assert.equal(pulseScore({ workoutsThisWeek: 0, weeklyGoal: 4, volumeThisWeek: 0, streakDays: 0 }), 0);
  });
});

describe("ageFromBirthDate", () => {
  it("computes age relative to a fixed now", () => {
    assert.equal(ageFromBirthDate("1994-09-05", new Date("2026-09-05")), 32);
    assert.equal(ageFromBirthDate("1994-09-06", new Date("2026-09-05")), 31);
  });
});

describe("platesFor", () => {
  it("loads 100 kg as 20 kg bar + 25 + 15 per side", () => {
    const r = platesFor(100);
    assert.deepEqual(r.perSide, [25, 15]);
    assert.equal(r.leftover, 0);
  });
  it("handles 60 kg as 20 kg per side", () => {
    assert.deepEqual(platesFor(60).perSide, [20]);
  });
  it("returns leftover when it cannot split exactly", () => {
    const r = platesFor(47);
    assert.ok(r.leftover > 0);
  });
});
