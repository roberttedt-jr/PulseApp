/** Pure swipe physics for the onboarding pager. No carousel library. */

export function rubberBand(delta: number, dim: number): number {
  const d = Math.max(1, dim * 0.55);
  const x = Math.abs(delta);
  const r = (1 - 1 / (x / d + 1)) * d;
  return Math.sign(delta) * r;
}

export function snapPageIndex(opts: {
  index: number;
  count: number;
  dx: number;
  width: number;
  vx: number;
}): number {
  const { index, count, dx, width, vx } = opts;
  if (count <= 1) return 0;
  const threshold = Math.max(48, width * 0.22);
  const flicked = Math.abs(vx) > 0.45 && Math.abs(dx) > 10;
  let next = index;
  if (dx > threshold || (flicked && dx > 0)) next = index - 1;
  else if (dx < -threshold || (flicked && dx < 0)) next = index + 1;
  return Math.max(0, Math.min(count - 1, next));
}
