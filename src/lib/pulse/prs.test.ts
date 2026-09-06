import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { compareToLast, computeCurrentPrs, type LiftSet } from "./prs.ts";

function s(p: Partial<LiftSet> & { exerciseId: string; weight: number; reps: number }): LiftSet {
  return {
    workoutId: p.workoutId ?? "w1",
    startedAt: p.startedAt ?? "2026-01-01T10:00:00.000Z",
    kind: p.kind ?? "work",
    ...p,
  };
}

describe("computeCurrentPrs", () => {
  it("returns nothing without completed work sets", () => {
    assert.deepEqual(computeCurrentPrs([]), []);
    assert.deepEqual(
      computeCurrentPrs([s({ exerciseId: "bench", weight: 80, reps: 5, kind: "warmup" })]),
      [],
    );
  });

  it("detects max weight, max reps, volume and 1RM", () => {
    const prs = computeCurrentPrs([
      s({ exerciseId: "bench", weight: 60, reps: 10, workoutId: "a", startedAt: "2026-01-01T10:00:00.000Z" }),
      s({ exerciseId: "bench", weight: 80, reps: 5, workoutId: "b", startedAt: "2026-02-01T10:00:00.000Z" }),
      s({ exerciseId: "bench", weight: 80, reps: 6, workoutId: "c", startedAt: "2026-03-01T10:00:00.000Z" }),
    ]);
    const byKind = Object.fromEntries(prs.map((p) => [p.kind, p]));
    assert.equal(byKind.max_weight?.weight, 80);
    assert.equal(byKind.max_weight?.reps, 6);
    assert.equal(byKind.max_reps?.reps, 10);
    assert.equal(byKind.max_reps?.weight, 60);
    assert.ok((byKind.one_rm?.oneRepMax ?? 0) > 80);
    assert.equal(byKind.max_volume?.volume, 60 * 10);
  });

  it("ignores bodyweight volume and still tracks max reps", () => {
    const prs = computeCurrentPrs([
      s({ exerciseId: "pull", weight: 0, reps: 12 }),
      s({ exerciseId: "pull", weight: 0, reps: 15, workoutId: "w2" }),
    ]);
    const byKind = Object.fromEntries(prs.map((p) => [p.kind, p]));
    assert.equal(byKind.max_reps?.reps, 15);
    assert.equal(byKind.max_weight, undefined);
    assert.equal(byKind.max_volume, undefined);
    assert.equal(byKind.one_rm, undefined);
  });
});

describe("compareToLast", () => {
  it("prefers heavier weight, then reps, then volume", () => {
    assert.equal(compareToLast({ weight: 82.5, reps: 5, volume: 400 }, { weight: 80, reps: 8, volume: 640 }), "weight");
    assert.equal(compareToLast({ weight: 80, reps: 9, volume: 720 }, { weight: 80, reps: 8, volume: 640 }), "reps");
    assert.equal(compareToLast({ weight: 80, reps: 8, volume: 960 }, { weight: 80, reps: 8, volume: 640 }), "volume");
    assert.equal(compareToLast({ weight: 80, reps: 8, volume: 640 }, { weight: 80, reps: 8, volume: 640 }), "same");
    assert.equal(compareToLast({ weight: 80, reps: 8, volume: 640 }, null), null);
  });
});
