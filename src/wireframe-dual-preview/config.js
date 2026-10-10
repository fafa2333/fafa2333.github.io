export const ROTATION = Object.freeze({
  cameraElevationDegrees: 28,
  // Three.js Y-up: positive yaw is counterclockwise when viewed from above.
  autoDegreesPerSecond: 3,
  initialDegrees: { bit: 15, hive: -20 },
  radiansPerPixel: .0055,
  resumeTimeConstant: .12,
  maxReleaseRadiansPerSecond: 1.4,
  staleReleaseMs: 80,
  touchThresholdPixels: 6,
});

export const LINE_STYLE = Object.freeze({
  color: '#828c7e',
  widthCSS: .8,
  maxDPR: 2,
  creaseAngleDegrees: 28, // Exporter threshold for flat architectural parts.
  cameraDirection: [1, Math.SQRT2 * Math.tan(ROTATION.cameraElevationDegrees * Math.PI / 180), -1],
  cameraDistance: 160,
  fov: 35,
  targetCoverage: .70,
  // Uniform scalar only: never stretch an individual axis.
  models: { bit: { scaleMultiplier: 1 }, hive: { scaleMultiplier: 1 } },
});
