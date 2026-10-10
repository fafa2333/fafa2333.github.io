import * as THREE from 'three';
import { architecturalMaterial } from '../wireframe-dual-preview/line-material.js';
import { TRANSITION } from './config.js';

export const cadDeclarations = `
  attribute vec3 cadData;
  attribute vec2 cadArc;
  attribute vec3 cadAnchor;
  attribute vec4 cadSchedule;
  uniform float uCadMode;
  uniform float uCadProgress;
  uniform vec2 uScanBounds;
  uniform float uScanSign;
  uniform vec2 uHeightBounds;
  uniform float uStageDuration;
  uniform vec4 uTimingWeights;
  uniform vec2 uClassLead;
  varying float cadVisible;
`;

// Trim endpoints BEFORE LineMaterial constructs its constant-width quad and
// round end caps. A connected path shares one clock; cadArc maps its cumulative
// length into individual segments. Original facing normals stay intact.
export const cadTrim = `
  vec4 start = modelViewMatrix * vec4(instanceStart, 1.0);
  vec4 end = modelViewMatrix * vec4(instanceEnd, 1.0);
  cadVisible = 1.0;
  if (uCadMode > .5) {
    vec4 projectedAnchor = projectionMatrix * modelViewMatrix * vec4(cadAnchor, 1.0);
    float span = max(uScanBounds.y - uScanBounds.x, .00001);
    float screenOrder = clamp((projectedAnchor.x / projectedAnchor.w - uScanBounds.x) / span, 0.0, 1.0);
    if (uScanSign < 0.0) screenOrder = 1.0 - screenOrder;
    float heightOrder = clamp((cadAnchor.y - uHeightBounds.x) / max(uHeightBounds.y - uHeightBounds.x, .00001), 0.0, 1.0);
    bool erase = uCadMode < 1.5;
    float order = dot(uTimingWeights, vec4(screenOrder, heightOrder, cadSchedule.y, cadSchedule.x));
    // Only a small lead for outlines on redraw. Detail strokes overlap, rather
    // than waiting for an entire primary-only phase to finish.
    if (!erase) order -= cadData.x < .5 ? uClassLead.x : cadData.x < 1.5 ? uClassLead.y : 0.0;
    order = clamp(order, .025, .975);
    float duration = min(cadSchedule.z, uStageDuration);
    float delay = order * max(0.0, uStageDuration - duration);
    float front = smoothstep(delay, delay + duration, uCadProgress * uStageDuration);
    if (uCadProgress <= 0.0) front = 0.0;
    if (uCadProgress >= 1.0) front = 1.0;
    vec2 arc = cadSchedule.w > .5 ? vec2(1.0) - cadArc : cadArc;
    float first = min(arc.x, arc.y);
    float last = max(arc.x, arc.y);
    float path = clamp((front - first) / max(last - first, .00000001), 0.0, 1.0);
    cadVisible = erase ? 1.0 - path : path;
    // Keep nonzero geometry even for invisible lines; discard them below.
    // This avoids normalize(0) in the original LineMaterial shader.
    float safePath = clamp(path, .00001, .99999);
    bool fromA = arc.x <= arc.y;
    if (erase && path > 0.0 && path < 1.0) {
      if (fromA) start = mix(start, end, safePath);
      else end = mix(end, start, safePath);
    } else if (!erase && path < 1.0) {
      if (fromA) end = mix(start, end, safePath);
      else start = mix(end, start, safePath);
    }
  }
`;

export function cadMaterial() {
  const material = architecturalMaterial(), original = material.onBeforeCompile;
  const uniforms = {
    uCadMode: { value: 0 }, uCadProgress: { value: 1 },
    uScanBounds: { value: new THREE.Vector2(-1, 1) },
    uScanSign: { value: TRANSITION.SCAN_DIRECTION === 'left_to_right' ? 1 : -1 },
    uHeightBounds: { value: new THREE.Vector2(0, 50) },
    uStageDuration: { value: TRANSITION.DISASSEMBLE_DURATION },
    uTimingWeights: { value: new THREE.Vector4(TRANSITION.DIRECTION_WEIGHT, TRANSITION.HEIGHT_WEIGHT,
      TRANSITION.NEIGHBOR_WEIGHT, TRANSITION.RANDOM_WEIGHT) },
    uClassLead: { value: new THREE.Vector2(TRANSITION.OUTLINE_LEAD, TRANSITION.PRIMARY_LEAD) },
  };
  material.onBeforeCompile = (shader, renderer) => {
    original(shader, renderer);
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader.replace('void main() {', cadDeclarations + '\nvoid main() {');
    const source = /vec4 start = modelViewMatrix \* vec4\( instanceStart, 1\.0 \);\s*vec4 end = modelViewMatrix \* vec4\( instanceEnd, 1\.0 \);/;
    if (!source.test(shader.vertexShader)) throw new Error('Incompatible Three.js line shader');
    shader.vertexShader = shader.vertexShader.replace(source, cadTrim);
    shader.fragmentShader = shader.fragmentShader.replace('void main() {', `
      varying float cadVisible;
      void main() {
        if (cadVisible < .00001) discard;
    `);
  };
  material.customProgramCacheKey = () => 'architectural-staggered-path-trim-v2';
  material.userData.cadUniforms = uniforms;
  return material;
}
