/**
 * Pulse 5.0 Ultra Native — Mathematical Core
 * High-precision geometry, spring-physics interpolation, and cubic Bézier splines.
 */

export interface PillInterpolationOptions {
  pointerX: number;
  trackWidth: number;
  tabCount: number;
  pillWidth: number;
}

export interface PillInterpolationResult {
  posX: number;
  continuousIndex: number;
  nearestIndex: number;
}

/**
 * Calculates the horizontal center coordinate of a specific tab item.
 */
export function calculateTabCenter(index: number, trackWidth: number, tabCount: number): number {
  if (tabCount <= 0 || trackWidth <= 0) return 0;
  const safeIndex = Math.max(0, Math.min(tabCount - 1, index));
  const tabWidth = trackWidth / tabCount;
  return (safeIndex + 0.5) * tabWidth;
}

/**
 * Calculates snapped left coordinate for the floating pill on a target tab.
 */
export function calculateTabOffset(
  index: number,
  trackWidth: number,
  tabCount: number,
  pillWidth: number,
): number {
  if (trackWidth <= 0 || tabCount <= 0) return 0;
  const center = calculateTabCenter(index, trackWidth, tabCount);
  const left = center - pillWidth / 2;
  const maxLeft = Math.max(0, trackWidth - pillWidth);
  return Math.max(0, Math.min(maxLeft, left));
}

/**
 * Continuous mathematical interpolation for real-time pointer scrubbing (0 ms latency).
 * Centers the active bubble pill under the touch/pointer with boundary clamping.
 */
export function calculatePillInterpolation({
  pointerX,
  trackWidth,
  tabCount,
  pillWidth,
}: PillInterpolationOptions): PillInterpolationResult {
  if (trackWidth <= 0 || tabCount <= 0) {
    return { posX: 0, continuousIndex: 0, nearestIndex: 0 };
  }

  // Clamp pointer to track bounds
  const clampedPointer = Math.max(0, Math.min(trackWidth, pointerX));
  const maxLeft = Math.max(0, trackWidth - pillWidth);
  const rawPos = clampedPointer - pillWidth / 2;
  const posX = Math.max(0, Math.min(maxLeft, rawPos));

  // Calculate continuous normalized progress [0, tabCount - 1]
  const progress = clampedPointer / trackWidth;
  const continuousIndex = Math.max(0, Math.min(tabCount - 1, progress * tabCount));
  const nearestIndex = Math.max(0, Math.min(tabCount - 1, Math.floor(progress * tabCount)));

  return { posX, continuousIndex, nearestIndex };
}

export interface BezierOptions {
  width?: number;
  height?: number;
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
}

export interface BezierPoint {
  x: number;
  y: number;
  value: number;
  index: number;
}

export interface BezierCurveResult {
  points: BezierPoint[];
  linePath: string;
  areaPath: string;
  minVal: number;
  maxVal: number;
}

/**
 * Mathematically generates a smooth C^1 continuous cubic Bézier curve
 * through an array of numeric data points (e.g. 12-week athletic volume).
 */
export function calculateBezierCurve(
  values: number[],
  options: BezierOptions = {},
): BezierCurveResult {
  const {
    width = 340,
    height = 140,
    paddingTop = 20,
    paddingBottom = 24,
    paddingLeft = 16,
    paddingRight = 16,
  } = options;

  if (!values || values.length === 0) {
    return {
      points: [],
      linePath: `M 0 ${height} L ${width} ${height}`,
      areaPath: `M 0 ${height} L ${width} ${height} Z`,
      minVal: 0,
      maxVal: 0,
    };
  }

  const plotWidth = Math.max(1, width - paddingLeft - paddingRight);
  const plotHeight = Math.max(1, height - paddingTop - paddingBottom);

  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal === minVal ? 1 : maxVal - minVal;

  const n = values.length;

  // Compute coordinate points
  const points: BezierPoint[] = values.map((val, i) => {
    const x = n === 1 ? width / 2 : paddingLeft + (i / (n - 1)) * plotWidth;
    const norm = (val - minVal) / range;
    const y = height - paddingBottom - norm * plotHeight;
    return { x, y, value: val, index: i };
  });

  if (points.length === 1) {
    const p = points[0]!;
    const linePath = `M ${paddingLeft} ${p.y.toFixed(2)} L ${width - paddingRight} ${p.y.toFixed(2)}`;
    const areaPath = `${linePath} L ${width - paddingRight} ${height} L ${paddingLeft} ${height} Z`;
    return { points, linePath, areaPath, minVal, maxVal };
  }

  // Smooth cubic Bézier spline calculation
  let linePath = `M ${points[0]!.x.toFixed(2)} ${points[0]!.y.toFixed(2)}`;

  for (let i = 0; i < n - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[Math.min(n - 1, i + 2)]!;

    // Catmull-Rom to Cubic Bézier control points
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;

    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    linePath += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }

  const firstPt = points[0]!;
  const lastPt = points[points.length - 1]!;
  const areaPath = `${linePath} L ${lastPt.x.toFixed(2)} ${height} L ${firstPt.x.toFixed(2)} ${height} Z`;

  return {
    points,
    linePath,
    areaPath,
    minVal,
    maxVal,
  };
}
