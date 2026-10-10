export const CONFIG = Object.freeze({
  PAPER: '#f7f7f4',
  DATA_PATH: '/models/bit-pointcloud-v5/',
  POINT_SIZE: .09, // V5 world radius; individual exported return sizes retained.
  POINT_COUNT: 100000, // Default balanced study, uniformly retained from V5 returns.
  SPARSE_POINT_COUNT: 57141,
  FULL_POINT_COUNT: 228564,
  LIGHT_POINT_COUNT: 114282, // ?quality=light: a stable 50% subset.
  DEFAULT_QUALITY: 'balanced',
  POINT_VARIANTS: Object.freeze({
    balanced: Object.freeze({ file: 'points-balanced.bin', count: 100000, radiusGain: 1.30 }),
    sparse: Object.freeze({ file: 'points-sparse.bin', count: 57141, radiusGain: 1.80 }),
    light: Object.freeze({ file: 'points-light.bin', count: 114282, radiusGain: 1.10 }),
    full: Object.freeze({ file: 'points.bin', count: 228564, radiusGain: 1 }),
  }),
  SCATTER_DISTANCE: 12,
  SCATTER_NOISE: 1.2,
  SCAN_DURATION: 1.8, // dissolve seconds
  AGGREGATE_DURATION: 3.2,
  SCAN_DIRECTION: 'left-to-right', // aggregate traverses right-to-left.
  SCAN_WINDOW: .22,
  ROTATION_SPEED: .0055, // radians per CSS pixel
  ROTATION_INERTIA: .055, // seconds; about 95% gone after .17s
  MAX_VERTICAL_ROTATION: Object.freeze([-25, 30]), // degrees relative to initial 3/4
  MAX_PIXEL_RATIO: 1.75,
  CAMERA_FOV: 35,
  CAMERA_DIRECTION: Object.freeze([1, .68, -1]),
  CAMERA_MARGIN: 1.17,
  DEPTH_INSET: .13,
  DRIFT_FPS: 30,
});
