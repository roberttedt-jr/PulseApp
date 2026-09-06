import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  authorizedMetrics,
  barRatio,
  COMPARE_COPY,
  COMPARE_METRICS,
  compareAccess,
  containsForbiddenCopy,
  countWorkSets,
  DEFAULT_COMPARE_PREFS,
  FORBIDDEN_COMPARE_WORDS,
  intersectById,
  intersectPrKeys,
  isComparableSet,
  parseComparePeriod,
  periodOrigin,
  sharedMetrics,
  uniqueLocalDays,
  volumeOfSets,
  type ComparePrefs,
} from "./compare.ts";

const allOn: ComparePrefs = {
  enabled: true,
  workouts: true,
  days: true,
  streak: true,
  sets: true,
  volume: true,
  exercises: true,
  prs: true,
};

describe("defaults", () => {
  it("starts fully private", () => {
    assert.equal(DEFAULT_COMPARE_PREFS.enabled, false);
    for (const m of COMPARE_METRICS) assert.equal(DEFAULT_COMPARE_PREFS[m.id], false);
    assert.equal(authorizedMetrics(DEFAULT_COMPARE_PREFS).length, 0);
  });
});

describe("permissions", () => {
  it("ignores metric flags when master is off", () => {
    assert.deepEqual(authorizedMetrics({ ...allOn, enabled: false }), []);
  });
  it("intersects only metrics both authorized", () => {
    const a: ComparePrefs = { ...allOn, volume: false, prs: false };
    const b: ComparePrefs = { ...allOn, days: false, exercises: false };
    assert.deepEqual(sharedMetrics(a, b), ["workouts", "streak", "sets"]);
  });
  it("hides everything if the friend master is off", () => {
    assert.deepEqual(sharedMetrics(allOn, { ...allOn, enabled: false }), []);
  });
});

describe("access", () => {
  const base = {
    viewerEnabled: true,
    friendEnabled: true,
    mutualAccepted: true,
    blocked: false,
    isSelf: false,
  };
  it("allows mutual accepted friends with both enabled", () => {
    assert.equal(compareAccess(base), "ok");
  });
  it("blocks self, viewer-off, one-way follow, friend-off and blocks", () => {
    assert.equal(compareAccess({ ...base, isSelf: true }), "self");
    assert.equal(compareAccess({ ...base, viewerEnabled: false }), "viewer_off");
    assert.equal(compareAccess({ ...base, mutualAccepted: false }), "unavailable");
    assert.equal(compareAccess({ ...base, friendEnabled: false }), "unavailable");
    assert.equal(compareAccess({ ...base, blocked: true }), "unavailable");
  });
  it("does not distinguish block from friend-off", () => {
    assert.equal(compareAccess({ ...base, blocked: true }), compareAccess({ ...base, friendEnabled: false }));
  });
});

describe("period", () => {
  it("week starts Monday 00:00 local", () => {
    const wed = new Date(2026, 8, 9, 15, 30, 0); // Wed 9 Sep 2026
    const origin = periodOrigin("week", wed);
    assert.equal(origin.getDay(), 1);
    assert.equal(origin.getDate(), 7);
    assert.equal(origin.getHours(), 0);
  });
  it("month starts on the 1st", () => {
    const origin = periodOrigin("month", new Date(2026, 8, 9, 15, 30, 0));
    assert.equal(origin.getDate(), 1);
    assert.equal(origin.getMonth(), 8);
    assert.equal(origin.getHours(), 0);
  });
  it("parses period safely", () => {
    assert.equal(parseComparePeriod("month"), "month");
    assert.equal(parseComparePeriod("nope"), "week");
  });
});

describe("aggregates", () => {
  it("excludes warmup from sets and volume", () => {
    const sets = [
      { weight: 40, reps: 8, kind: "warmup", completed: true },
      { weight: 60, reps: 8, kind: "work", completed: true },
      { weight: 80, reps: 5, kind: "work", completed: false },
    ];
    assert.equal(isComparableSet("warmup", true), false);
    assert.equal(countWorkSets(sets), 1);
    assert.equal(volumeOfSets(sets), 480);
  });
  it("counts unique local days", () => {
    const localISO = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const a = new Date(2026, 8, 7, 8, 0, 0);
    const b = new Date(2026, 8, 7, 21, 0, 0);
    const c = new Date(2026, 8, 8, 9, 0, 0);
    assert.equal(uniqueLocalDays([a.toISOString(), b.toISOString(), c.toISOString()], localISO), 2);
  });
  it("intersects catalog exercises and pr kinds", () => {
    assert.deepEqual(
      intersectById(
        [{ exerciseId: "bench_press" }, { exerciseId: "squat" }],
        [{ exerciseId: "bench_press" }, { exerciseId: "deadlift" }],
      ),
      ["bench_press"],
    );
    assert.deepEqual(
      intersectPrKeys(
        [
          { exerciseId: "bench_press", kind: "one_rm" },
          { exerciseId: "bench_press", kind: "max_weight" },
        ],
        [{ exerciseId: "bench_press", kind: "one_rm" }],
      ),
      ["bench_press:one_rm"],
    );
  });
  it("keeps bars in 0–1 without ranking language", () => {
    assert.equal(barRatio(0, 10), 0);
    assert.equal(barRatio(5, 10), 0.5);
    assert.equal(barRatio(10, 10), 1);
    assert.equal(barRatio(4, 0), 0);
  });
});

describe("healthy copy", () => {
  it("uses the required phrases and none of the forbidden ones", () => {
    const blob = [
      COMPARE_COPY.title,
      COMPARE_COPY.subtitle,
      COMPARE_COPY.you,
      COMPARE_COPY.them("@leo"),
      COMPARE_COPY.enableMaster,
      ...COMPARE_METRICS.map((m) => `${m.label} ${m.hint}`),
      COMPARE_COPY.cta,
      COMPARE_COPY.privacyNote,
    ].join(" ");
    assert.match(blob, /Tu actividad/);
    assert.match(blob, /Actividad de @leo/);
    assert.match(blob, /Entrenamientos completados/);
    assert.match(blob, /Volumen registrado/);
    assert.match(blob, /Ambos decidís qué compartir/);
    assert.equal(containsForbiddenCopy(blob), false);
    for (const w of FORBIDDEN_COMPARE_WORDS) assert.equal(blob.toLowerCase().includes(w), false);
  });
});
