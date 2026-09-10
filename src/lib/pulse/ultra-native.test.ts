import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateBezierCurve,
  calculatePillInterpolation,
  calculateTabCenter,
  calculateTabOffset,
} from "./ultra-native-math.ts";

describe("Ultra Native Math — Tabbar Interpolation & Spring Geometry", () => {
  it("calculates exact horizontal centers for all 5 tabs", () => {
    const trackWidth = 500;
    const tabCount = 5;
    // Each tab is 100px wide. Centers: 50, 150, 250, 350, 450
    assert.equal(calculateTabCenter(0, trackWidth, tabCount), 50);
    assert.equal(calculateTabCenter(1, trackWidth, tabCount), 150);
    assert.equal(calculateTabCenter(2, trackWidth, tabCount), 250);
    assert.equal(calculateTabCenter(3, trackWidth, tabCount), 350);
    assert.equal(calculateTabCenter(4, trackWidth, tabCount), 450);

    // Out of bounds clamping
    assert.equal(calculateTabCenter(-1, trackWidth, tabCount), 50);
    assert.equal(calculateTabCenter(10, trackWidth, tabCount), 450);
  });

  it("calculates snapped pill offset centered on the tab", () => {
    const trackWidth = 500;
    const tabCount = 5;
    const pillWidth = 70;
    // Tab 0: center = 50 -> offset = 50 - 35 = 15
    assert.equal(calculateTabOffset(0, trackWidth, tabCount, pillWidth), 15);
    // Tab 2: center = 250 -> offset = 250 - 35 = 215
    assert.equal(calculateTabOffset(2, trackWidth, tabCount, pillWidth), 215);
    // Tab 4: center = 450 -> offset = 450 - 35 = 415
    assert.equal(calculateTabOffset(4, trackWidth, tabCount, pillWidth), 415);
  });

  it("performs 0ms continuous scrubbing interpolation with boundary clamping", () => {
    const trackWidth = 500;
    const tabCount = 5;
    const pillWidth = 70;

    // At left edge: pointerX = 0 -> clamped to 0
    const atZero = calculatePillInterpolation({ pointerX: 0, trackWidth, tabCount, pillWidth });
    assert.equal(atZero.posX, 0);
    assert.equal(atZero.nearestIndex, 0);

    // Negative pointer coordinate clamps to 0
    const negative = calculatePillInterpolation({ pointerX: -100, trackWidth, tabCount, pillWidth });
    assert.equal(negative.posX, 0);
    assert.equal(negative.nearestIndex, 0);

    // At tab 1 center: pointerX = 150 -> posX = 150 - 35 = 115
    const tab1 = calculatePillInterpolation({ pointerX: 150, trackWidth, tabCount, pillWidth });
    assert.equal(tab1.posX, 115);
    assert.equal(tab1.nearestIndex, 1);

    // Scrubbing midway between tab 1 and tab 2: pointerX = 200 -> posX = 165
    const mid = calculatePillInterpolation({ pointerX: 200, trackWidth, tabCount, pillWidth });
    assert.equal(mid.posX, 165);
    assert.equal(mid.continuousIndex, 2);

    // Past right edge: pointerX = 600 -> clamped to maxLeft = 500 - 70 = 430
    const pastRight = calculatePillInterpolation({ pointerX: 600, trackWidth, tabCount, pillWidth });
    assert.equal(pastRight.posX, 430);
    assert.equal(pastRight.nearestIndex, 4);
  });
});

describe("Ultra Native Math — Smooth Cubic Bézier Spline Generation", () => {
  const sample12Weeks = [
    8200, 9400, 11200, 10500, 12800, 14200, 13600, 15400, 14900, 16800, 17500, 18200,
  ];

  it("generates C^1 continuous Bézier curve and area path for 12 data points", () => {
    const res = calculateBezierCurve(sample12Weeks, { width: 340, height: 140 });

    assert.equal(res.points.length, 12);
    assert.equal(res.minVal, 8200);
    assert.equal(res.maxVal, 18200);

    // Verify SVG linePath starts with M and contains 11 C segments
    assert.match(res.linePath, /^M \d+\.\d+ \d+\.\d+/);
    const cubicMatches = res.linePath.match(/ C /g);
    assert.equal(cubicMatches?.length, 11);

    // Verify areaPath closes with Z
    assert.match(res.areaPath, /Z$/);
    assert.ok(res.areaPath.includes(res.linePath));

    // Verify all points are within the SVG box boundaries
    res.points.forEach((pt) => {
      assert.ok(pt.x >= 16 && pt.x <= 340 - 16, `x ${pt.x} must be within bounds`);
      assert.ok(pt.y >= 20 && pt.y <= 140 - 24, `y ${pt.y} must be within bounds`);
    });
  });

  it("handles zero variance (constant volume across all weeks)", () => {
    const constant = [10000, 10000, 10000, 10000];
    const res = calculateBezierCurve(constant, { width: 300, height: 100 });

    assert.equal(res.points.length, 4);
    assert.doesNotMatch(res.linePath, /NaN/);
    assert.doesNotMatch(res.areaPath, /NaN/);
    assert.match(res.areaPath, /Z$/);
  });

  it("safely handles single point and empty array edge cases", () => {
    const single = calculateBezierCurve([15000]);
    assert.equal(single.points.length, 1);
    assert.doesNotMatch(single.linePath, /NaN/);
    assert.match(single.areaPath, /Z$/);

    const empty = calculateBezierCurve([]);
    assert.equal(empty.points.length, 0);
    assert.match(empty.linePath, /^M/);
    assert.match(empty.areaPath, /Z$/);
  });
});

describe("Ultra Native Tabbar — Mount & Scope Safety", () => {
  it("ensures drag controller is declared before paintPill and spring initialization", async () => {
    const fs = await import("node:fs");
    const code = fs.readFileSync(new URL("../../components/layout/app-shell.tsx", import.meta.url), "utf8");
    const dragIdx = code.indexOf("const drag = { on: false, last: -1, width: 0, left: 0 };");
    const paintPillIdx = code.indexOf("const paintPill = (index: number) =>");
    const pillSpringIdx = code.indexOf("pillSpring.set(activeRef.current);");

    assert.ok(dragIdx !== -1, "drag object must be declared");
    assert.ok(paintPillIdx !== -1, "paintPill must be declared");
    assert.ok(pillSpringIdx !== -1, "pillSpring.set must be called");
    assert.ok(dragIdx < paintPillIdx, "drag must be declared BEFORE paintPill to prevent TDZ ReferenceError");
    assert.ok(dragIdx < pillSpringIdx, "drag must be declared BEFORE pillSpring.set to prevent TDZ ReferenceError");
  });
});
