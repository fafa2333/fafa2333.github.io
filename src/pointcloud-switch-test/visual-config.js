// Appearance only. Source returns, model normalization and SWITCH timing are
// deliberately independent of this configuration.
export const VISUAL = Object.freeze({
  BACKGROUND_VARIABLE: '--pointcloud-paper',
  INK: '#454B45',
  OPACITY: .94,
  DEPTH_RANGE: 100,
  DEPTH_LIGHTENING: .025,
  FACING_LIGHTENING: .008,
  POINT_SIZE_GAIN: .82,
  MIN_DIAMETER_CSS: 1,
  MAX_DIAMETER_CSS: 1.65,
  FLOOR_RETENTION: .16,
  DENSITY: Object.freeze([
    Object.freeze({ width: 320, ratio: .38 }),
    Object.freeze({ width: 500, ratio: .55 }),
    Object.freeze({ width: 1066, ratio: .85 }),
  ]),
  CARD_WIDTH: 500,
  CARD_ASPECT: .95,
});

export function displayDensity(width) {
  const stops = VISUAL.DENSITY;
  if (width <= stops[0].width) return stops[0].ratio;
  for (let i = 1; i < stops.length; i++) {
    if (width <= stops[i].width) {
      const a = stops[i - 1], b = stops[i];
      return a.ratio + (b.ratio - a.ratio) * (width - a.width) / (b.width - a.width);
    }
  }
  return stops.at(-1).ratio;
}
