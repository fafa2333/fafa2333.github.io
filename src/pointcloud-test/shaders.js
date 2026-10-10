export const scanGLSL = /* glsl */`
uniform float uProgress;
uniform float uMode;
uniform vec2 uScanBounds;
uniform float uScanWindow;
uniform float uScanSign;
float scatterAmount(float screenX, vec3 original) {
  float scan = clamp((screenX - uScanBounds.x) /
    max(.001, uScanBounds.y - uScanBounds.x), 0., 1.);
  if (uScanSign < 0.) scan = 1. - scan;
  float ordered = uMode > 0. ? scan : 1. - scan;
  float jitter = sin(dot(original, vec3(.037, .13, .041))) * .014;
  float start = clamp(ordered * (1. - uScanWindow) + jitter, 0., 1. - uScanWindow);
  float t = smoothstep(start, start + uScanWindow, uProgress);
  return uMode > 0. ? t : 1. - t;
}
`;

export const pointVertex = /* glsl */`
${scanGLSL}
attribute vec3 aOriginalPosition;
attribute vec3 aScatterPosition;
attribute vec3 aRandom;
attribute vec3 aNormal;
attribute vec3 aInk;
attribute float aRadius;
uniform float uTime;
uniform float uNoise;
uniform float uPointScale;
uniform float uViewportHeight;
varying vec3 vInk;
void main() {
  vec4 originalClip = projectionMatrix * modelViewMatrix * vec4(aOriginalPosition, 1.);
  float amount = scatterAmount(originalClip.x / originalClip.w, aOriginalPosition);
  vec3 drift = sin(aRandom * 6.283185 + vec3(.43, .37, .31) * uTime) * uNoise * .12;
  // No drift at rest: amount=0 recovers originalPosition exactly.
  vec3 transformed = mix(aOriginalPosition, aScatterPosition, amount) + drift * amount;
  vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = clamp(2. * aRadius * uPointScale * uViewportHeight *
    projectionMatrix[1][1] / max(.01, -mvPosition.z) * .5, 1., 32.);
  // In assembled regions, prevent rear-facing returns from thickening the cloud.
  vec3 viewNormal = normalize(normalMatrix * aNormal);
  if (amount < .001 && dot(viewNormal, normalize(-mvPosition.xyz)) < -.05) {
    gl_Position = vec4(2., 2., 2., 1.); gl_PointSize = 0.;
  }
  vInk = aInk;
}
`;

export const pointFragment = /* glsl */`
varying vec3 vInk;
void main() {
  float radius = length(gl_PointCoord - .5) * 2.;
  if (radius > 1.) discard;
  float edge = clamp(fwidth(radius), .04, .18);
  float coverage = 1. - smoothstep(1. - edge, 1., radius);
  gl_FragColor = vec4(vInk, coverage);
  #include <colorspace_fragment>
}
`;

export const depthVertex = /* glsl */`
uniform float uInset;
varying vec3 vOriginal;
void main() {
  vOriginal = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position - normal * uInset, 1.);
}
`;
export const depthFragment = /* glsl */`
${scanGLSL}
varying vec3 vOriginal;
uniform float uViewportWidth;
void main() {
  // Occlude intact regions only. Scattered regions are transparent in depth.
  float screenX = gl_FragCoord.x / uViewportWidth * 2. - 1.;
  if (scatterAmount(screenX, vOriginal) > .0001) discard;
  gl_FragColor = vec4(0.);
}
`;
