import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PerspectiveCamera, Vector3 } from 'three';
import { CONFIG } from '../src/pointcloud-test/config.js';
import { DISPLAY } from '../src/pointcloud-test/display-config.js';
import { parseBinary, scatterPosition } from '../src/pointcloud-test/core.js';
import { calculateNormalization, normalizePosition } from '../src/pointcloud-test/normalization.js';

function source(name) {
  const file = name === 'bit' ? 'bit-pointcloud-v5' : 'ntu-hive-pointcloud-v4';
  const b = readFileSync(new URL(`../public/models/${file}/points-balanced.bin`, import.meta.url));
  const binary = parseBinary(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), 0x42545043, 10);
  const positions = new Float32Array(binary.count * 3);
  for (let i = 0; i < binary.count; i++) positions.set(binary.data.subarray(i * 10, i * 10 + 3), i * 3);
  return positions;
}
const sources = { bit: source('bit'), hive: source('hive') };
function settings(aspect, scaleMultiplier = 1) {
  return { aspect, fov: CONFIG.CAMERA_FOV, direction: CONFIG.CAMERA_DIRECTION,
    distance: DISPLAY.CAMERA_DISTANCE, targetCoverage: DISPLAY.TARGET_COVERAGE, scaleMultiplier };
}
function independentProjection(positions, normalization, aspect) {
  const camera = new PerspectiveCamera(CONFIG.CAMERA_FOV, aspect, .1, 1000);
  camera.position.fromArray(CONFIG.CAMERA_DIRECTION).normalize().multiplyScalar(DISPLAY.CAMERA_DISTANCE);
  camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
  const p = new Vector3(), min = [Infinity, Infinity], max = [-Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    p.fromArray(normalizePosition(Array.from(positions.subarray(i, i + 3)), normalization)).project(camera);
    min[0] = Math.min(min[0], p.x); max[0] = Math.max(max[0], p.x);
    min[1] = Math.min(min[1], p.y); max[1] = Math.max(max[1], p.y);
  }
  return { coverage: Math.max((max[0] - min[0]) / 2, (max[1] - min[1]) / 2),
    center: min.map((v, axis) => (v + max[axis]) / 2) };
}

test('both real clouds occupy 70% and share the screen center under the same fixed camera', () => {
  for (const aspect of [1066 / 576, 366 / 620]) for (const name of ['bit', 'hive']) {
    const positions = sources[name], before = positions.slice();
    const result = calculateNormalization(positions, settings(aspect));
    const projection = independentProjection(positions, result, aspect);
    assert.ok(Math.abs(projection.coverage - .70) < 1e-6, `${name}: ${projection.coverage}`);
    assert.ok(projection.center.every(v => Math.abs(v) < 1e-6), `${name}: ${projection.center}`);
    assert.deepEqual(positions, before);
  }
});

test('normalization preserves proportions, uses independent multipliers and survives source translations', () => {
  const positions = sources.hive, base = calculateNormalization(positions, settings(1066 / 576));
  const adjusted = calculateNormalization(positions, settings(1066 / 576, 1.03));
  assert.ok(Math.abs(adjusted.scale / base.scale - 1.03) < 1e-10);
  const a = Array.from(positions.subarray(0, 3)), b = Array.from(positions.subarray(333, 336));
  const normalizedA = normalizePosition(a, base), normalizedB = normalizePosition(b, base);
  for (let axis = 0; axis < 3; axis++) {
    assert.ok(Math.abs(normalizedB[axis] - normalizedA[axis] - (b[axis] - a[axis]) * base.scale) < 1e-8);
  }
  const translated = Float64Array.from(positions, (v, i) => v + [190, -25, 74][i % 3]);
  const moved = calculateNormalization(translated, settings(1066 / 576));
  assert.ok(Math.abs(moved.scale - base.scale) < 1e-8);
  const recovered = normalizePosition(Array.from(translated.subarray(0, 3)), moved);
  assert.ok(recovered.every((v, i) => Math.abs(v - normalizedA[i]) < 1e-6));
});

test('scatter is generated from normalized coordinates with the same bounded world amplitude', () => {
  for (const name of ['bit', 'hive']) {
    const positions = sources[name], normalization = calculateNormalization(positions, settings(1066 / 576));
    for (let i = 0; i < 1000; i++) {
      const p = normalizePosition(Array.from(positions.subarray(i * 3, i * 3 + 3)), normalization);
      const target = scatterPosition(p, i + 20261008, CONFIG.SCATTER_DISTANCE);
      assert.ok(Math.hypot(...target.map((v, axis) => v - p[axis])) < CONFIG.SCATTER_DISTANCE * 1.45);
      assert.deepEqual(target, scatterPosition(p, i + 20261008, CONFIG.SCATTER_DISTANCE));
    }
  }
});
