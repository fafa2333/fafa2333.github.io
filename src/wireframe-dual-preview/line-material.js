import * as THREE from 'three';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LINE_STYLE } from './config.js';

// Antialiased CSS-pixel lines rather than implementation-dependent GL lineWidth.
// Facing is evaluated on the GPU, so curved silhouettes follow the same drag
// rotation as the surfaces without rebuilding edges on each animation frame.
export function architecturalMaterial() {
  const material = new LineMaterial({ color: LINE_STYLE.color, linewidth: LINE_STYLE.widthCSS,
    depthTest: true, depthWrite: false, transparent: false, alphaToCoverage: true });
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('void main() {', `
      attribute vec3 faceA;
      attribute vec3 faceB;
      attribute float structural;
      varying float lineVisible;
      void main() {
        vec3 midpoint = (modelViewMatrix * vec4((instanceStart + instanceEnd) * .5, 1.0)).xyz;
        vec3 view = normalize(-midpoint);
        float facingA = dot(normalMatrix * faceA, view);
        float facingB = dot(normalMatrix * faceB, view);
        lineVisible = max(structural, facingA * facingB < 0.0 ? 1.0 : 0.0);
    `);
    shader.fragmentShader = shader.fragmentShader.replace('void main() {', `
      varying float lineVisible;
      void main() {
        if (lineVisible < .5) discard;
    `);
  };
  material.customProgramCacheKey = () => 'architectural-structure-and-silhouette-v1';
  return material;
}

export function occlusionMaterial() {
  // Invisible faces supply depth only: no shaded gray model, lighting or shadow.
  return new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: true,
    side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 2 });
}
