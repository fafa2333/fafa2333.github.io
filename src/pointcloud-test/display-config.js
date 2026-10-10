// Display units are independent of each building's real-world dimensions.
// Per-model multipliers adjust the automatically calculated uniform scale.
export const DISPLAY = Object.freeze({
  CAMERA_DISTANCE: 160,
  TARGET_COVERAGE: .70, // max(projected width / viewport, projected height / viewport)
  MODELS: Object.freeze({
    bit: Object.freeze({ scaleMultiplier: 1 }),
    hive: Object.freeze({ scaleMultiplier: 1 }),
  }),
});
