import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addDays,
  computeStreaks,
  dayStatus,
  formatRange,
  groupSessionsByDay,
  heatmapColumns,
  localISO,
  mondayOf,
  restWeekdaysFromPlan,
  weekdayMon,
  type ConsistencySession,
  type PlanDay,
} from "./consistency.ts";

function d(iso: string): Date {
  return new Date(`${iso}T12:00:00`);
}

function session(id: string, started: string, volume = 4000): ConsistencySession {
  return {
    id,
    startedAt: `${started}T18:00:00`,
    title: "Push",
    durationSeconds: 3600,
    volume,
    setCount: 12,
    exercises: ["Press banca"],
  };
}

describe("local calendar", () => {
  it("mondayOf lands on Monday", () => {
    const wed = d("2026-09-09");
    assert.equal(weekdayMon(wed), 2);
    assert.equal(localISO(mondayOf(wed)), "2026-09-07");
  });
});

describe("restWeekdaysFromPlan", () => {
  it("treats empty plan as no rest days", () => {
    const r = restWeekdaysFromPlan([]);
    assert.equal(r.hasPlan, false);
    assert.equal(r.rest.size, 0);
  });
  it("marks days without a routine as rest when a plan exists", () => {
    const plan: PlanDay[] = [
      { weekday: 0, routineId: "a", routineName: "Push" },
      { weekday: 2, routineId: "b", routineName: "Pull" },
      { weekday: 4, routineId: "c", routineName: "Legs" },
    ];
    const r = restWeekdaysFromPlan(plan);
    assert.equal(r.hasPlan, true);
    assert.deepEqual([...r.rest].sort(), [1, 3, 5, 6]);
  });
});

describe("groupSessionsByDay", () => {
  it("does not count the same session twice", () => {
    const s = session("w1", "2026-09-05");
    const map = groupSessionsByDay([s, s]);
    assert.equal(map.get("2026-09-05")?.length, 1);
  });
});

describe("dayStatus", () => {
  const today = d("2026-09-05");
  const rest = new Set([6]); // Sunday
  it("marks future days", () => {
    assert.equal(
      dayStatus({ date: d("2026-09-06"), today, sessions: [], hasPlan: false, restWeekdays: new Set() }),
      "future",
    );
  });
  it("marks a completed session as done", () => {
    assert.equal(
      dayStatus({
        date: today,
        today,
        sessions: [session("w1", "2026-09-05")],
        hasPlan: false,
        restWeekdays: new Set(),
      }),
      "done",
    );
  });
  it("marks two sessions or high volume as high", () => {
    assert.equal(
      dayStatus({
        date: today,
        today,
        sessions: [session("a", "2026-09-05"), session("b", "2026-09-05")],
        hasPlan: false,
        restWeekdays: new Set(),
      }),
      "high",
    );
  });
  it("marks planned rest when there is no session", () => {
    assert.equal(
      dayStatus({
        date: d("2026-08-30"),
        today,
        sessions: [],
        hasPlan: true,
        restWeekdays: rest,
      }),
      "rest",
    );
  });
  it("marks a planned training day without a session as missed", () => {
    assert.equal(
      dayStatus({
        date: d("2026-09-04"),
        today,
        sessions: [],
        hasPlan: true,
        restWeekdays: rest,
        firstTrained: "2026-08-18",
      }),
      "missed",
    );
  });
  it("does not mark missed before the first workout", () => {
    assert.equal(
      dayStatus({
        date: d("2026-07-01"),
        today,
        sessions: [],
        hasPlan: true,
        restWeekdays: rest,
        firstTrained: "2026-08-18",
      }),
      "empty",
    );
  });
});

describe("computeStreaks", () => {
  it("returns 0 with no sessions", () => {
    const s = computeStreaks(new Set(), new Set(), false, d("2026-09-05"));
    assert.equal(s.current, 0);
    assert.equal(s.longest, 0);
  });

  it("counts today as the start of a streak", () => {
    const s = computeStreaks(new Set(["2026-09-05"]), new Set(), false, d("2026-09-05"));
    assert.equal(s.current, 1);
  });

  it("uses yesterday if today is still empty", () => {
    const s = computeStreaks(new Set(["2026-09-04"]), new Set(), false, d("2026-09-05"));
    assert.equal(s.current, 1);
  });

  it("does not break on planned rest days", () => {
    // Fri train, Sat rest, Sun rest, Mon train. Today = Monday.
    const trained = new Set(["2026-09-04", "2026-09-07"]);
    const rest = new Set([5, 6]); // Sat, Sun
    const s = computeStreaks(trained, rest, true, d("2026-09-07"));
    assert.equal(s.current, 2);
  });

  it("breaks on a missed planned day", () => {
    const trained = new Set(["2026-09-01"]);
    const rest = new Set([6]);
    const s = computeStreaks(trained, rest, true, d("2026-09-05"));
    assert.equal(s.current, 0);
  });

  it("tracks the longest run across history", () => {
    const trained = new Set(["2026-08-31", "2026-09-01", "2026-09-02", "2026-09-05"]);
    const s = computeStreaks(trained, new Set(), false, d("2026-09-05"));
    assert.equal(s.current, 1);
    assert.equal(s.longest, 3);
  });

  it("walks rest days when computing longest", () => {
    const trained = new Set(["2026-09-01", "2026-09-03", "2026-09-04"]);
    const rest = new Set([2]); // Wednesday 2026-09-02
    const s = computeStreaks(trained, rest, true, d("2026-09-04"));
    assert.equal(s.current, 3);
    assert.equal(s.longest, 3);
  });
});

describe("addDays", () => {
  it("crosses month boundaries", () => {
    assert.equal(localISO(addDays(d("2026-08-31"), 1)), "2026-09-01");
  });
});

describe("heatmapColumns", () => {
  it("returns 12 Mon–Sun weeks ending this week", () => {
    const today = d("2026-09-05");
    const cols = heatmapColumns(today, 12);
    assert.equal(cols.length, 12);
    assert.equal(cols[0]!.length, 7);
    assert.equal(localISO(cols[0]![0]!), "2026-06-15");
    assert.equal(localISO(cols[11]![0]!), "2026-08-31");
    assert.equal(localISO(cols[11]![6]!), "2026-09-06");
    assert.equal(weekdayMon(cols[0]![0]!), 0);
  });
});

describe("formatRange", () => {
  it("uses a short Spanish range", () => {
    assert.equal(formatRange(d("2026-08-31"), d("2026-09-06")), "31 ago – 6 sep");
  });
});
