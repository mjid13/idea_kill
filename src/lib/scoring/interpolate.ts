/**
 * Anchor points used to translate a raw metric value into a 0-100 score.
 * Points must be sorted by ascending `x` (the metric value); `y` (the score)
 * can move in either direction, which lets the same helper express both
 * "higher is better" metrics (gross margin) and "lower is better" metrics
 * (CAC payback, churn) as long as the anchors already encode the direction.
 */
export type ScoreAnchor = readonly [x: number, y: number];

/** Linearly interpolates a score between the nearest anchor points, clamping outside the range. */
export function interpolateScore(value: number, points: readonly ScoreAnchor[]): number {
  if (!Number.isFinite(value) || points.length === 0) return 0;
  if (value <= points[0][0]) return points[0][1];
  if (value >= points[points.length - 1][0]) return points[points.length - 1][1];

  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    if (value >= x0 && value <= x1) {
      if (x1 === x0) return y0;
      const t = (value - x0) / (x1 - x0);
      return y0 + t * (y1 - y0);
    }
  }
  return points[points.length - 1][1];
}

/** Maps a 1-5 qualitative rating directly to a 0-100 score (1 -> 0, 5 -> 100). */
export function ratingToScore(rating: number): number {
  return interpolateScore(rating, [
    [1, 0],
    [5, 100],
  ]);
}

/** Same as ratingToScore but inverted, for ratings where a high number is bad (e.g. risk). */
export function invertedRatingToScore(rating: number): number {
  return interpolateScore(rating, [
    [1, 100],
    [5, 0],
  ]);
}

export function average(values: number[]): number {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return 0;
  return finite.reduce((sum, v) => sum + v, 0) / finite.length;
}

export function weightedAverage(pairs: Array<[value: number, weight: number]>): number {
  const totalWeight = pairs.reduce((sum, [, w]) => sum + w, 0);
  if (totalWeight === 0) return 0;
  const weightedSum = pairs.reduce((sum, [v, w]) => sum + v * w, 0);
  return weightedSum / totalWeight;
}
