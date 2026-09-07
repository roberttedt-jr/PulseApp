import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { rubberBand, snapPageIndex } from "./swipe.ts";

describe("swipe physics", () => {
  it("rubber-bands past the first and last page", () => {
    const r = rubberBand(200, 320);
    assert.ok(r > 0 && r < 200);
    assert.equal(Math.sign(rubberBand(-80, 320)), -1);
  });

  it("snaps with a flick or a threshold drag", () => {
    assert.equal(snapPageIndex({ index: 0, count: 4, dx: -120, width: 320, vx: 0 }), 1);
    assert.equal(snapPageIndex({ index: 1, count: 4, dx: 120, width: 320, vx: 0 }), 0);
    assert.equal(snapPageIndex({ index: 1, count: 4, dx: -20, width: 320, vx: -0.8 }), 2);
    assert.equal(snapPageIndex({ index: 0, count: 4, dx: 80, width: 320, vx: 0.9 }), 0);
    assert.equal(snapPageIndex({ index: 3, count: 4, dx: -200, width: 320, vx: -1 }), 3);
  });
});
