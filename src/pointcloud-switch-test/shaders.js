import { scanGLSL, pointVertex, pointFragment, depthVertex, depthFragment } from '../pointcloud-test/shaders.js';

// Extend the existing shader, preserving dot sizing, geometry shading, round
// footprint, depth bias and color conversion. Both phases travel screen L->R.
const switchScan = /* glsl */`
uniform float uProgress;
uniform float uMode;
uniform vec2 uScanBounds;
uniform float uScanWindow;
uniform float uScanSign;
float scatterAmount(float screenX, vec3 original) {
  float scan = clamp((screenX - uScanBounds.x) / max(.001, uScanBounds.y - uScanBounds.x), 0., 1.);
  float jitter = sin(dot(original, vec3(.037, .13, .041))) * .014;
  float start = clamp(scan * (1. - uScanWindow) + jitter, 0., 1. - uScanWindow);
  float scanned = smoothstep(start, start + uScanWindow, uProgress);
  return uMode > 0. ? scanned : 1. - scanned;
}
`;

export const switchPointVertex = pointVertex.replace(scanGLSL, switchScan)
  .replace('varying vec3 vInk;', /* glsl */`
uniform vec3 uPointInk;
uniform vec3 uPaperInk;
uniform float uOpacity;
uniform float uDisplayDensity;
uniform float uFloorRetention;
uniform float uPointSizeGain;
uniform float uPixelRatio;
uniform vec2 uDiameterCSS;
uniform float uDepthCenter;
uniform float uDepthRange;
uniform float uDepthLightening;
uniform float uFacingLightening;
varying vec3 vInk;
varying float vVisibility;`)
  .replace('if (amount < .001 && dot(', 'if (dot(')
  .replace('  vInk = aInk;', /* glsl */`
  // CSS-sized dots stay granular at card sizes and on Retina displays.
  gl_PointSize = clamp(gl_PointSize * uPointSizeGain,
    uDiameterCSS.x * uPixelRatio, uDiameterCSS.y * uPixelRatio);
  float depth = clamp((-mvPosition.z - uDepthCenter + uDepthRange * .5) / uDepthRange, 0., 1.);
  float facing = clamp(dot(viewNormal, normalize(-mvPosition.xyz)), 0., 1.);
  float lighten = depth * uDepthLightening + (1. - facing) * uFacingLightening;
  vInk = mix(uPointInk, uPaperInk, lighten);
  vVisibility = (1. - amount) * uOpacity;
  // Stable per-return selection: no resampling or changing source coordinates.
  // Horizontal slab faces receive a small retention bonus for both buildings.
  float retain = min(1., uDisplayDensity + uFloorRetention * smoothstep(.65, .9, abs(aNormal.y)));
  if (aRandom.x > retain) {
    gl_Position = vec4(2., 2., 2., 1.); gl_PointSize = 0.; vVisibility = 0.;
  }`);
export const switchPointFragment = pointFragment
  .replace('varying vec3 vInk;', 'varying vec3 vInk;\nvarying float vVisibility;')
  .replace('  float radius =', '  if (vVisibility < .0001) discard;\n  float radius =')
  .replace('vec4(vInk, coverage)', 'vec4(vInk, coverage * vVisibility)');
export const switchDepthVertex = depthVertex;
export const switchDepthFragment = depthFragment.replace(scanGLSL, switchScan);
