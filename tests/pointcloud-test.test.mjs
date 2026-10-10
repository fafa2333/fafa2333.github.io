import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseBinary, scanAmount, ScanState, scatterPosition, clampPitch } from '../src/pointcloud-test/core.js';
import { CONFIG } from '../src/pointcloud-test/config.js';
import { Matrix4, PerspectiveCamera, Vector3 } from 'three';
import { pointVertex, depthFragment } from '../src/pointcloud-test/shaders.js';

test('scan ordering follows projected screen X after the building turns 180 degrees', () => {
  const camera = new PerspectiveCamera(35, 1, .1, 1000);
  camera.position.set(0, 0, 100); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
  const mvp = new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  const rotated = mvp.clone().multiply(new Matrix4().makeRotationY(Math.PI));
  for (const transform of [mvp, rotated]) {
    const projected = [-10, 10].map(x => new Vector3(x, 0, 0).applyMatrix4(transform).x);
    const lo = Math.min(...projected), hi = Math.max(...projected);
    const amounts = projected.map(x => scanAmount((x - lo) / (hi - lo), .4, 1));
    assert.equal(amounts[projected[0] < projected[1] ? 0 : 1], 1);
    assert.equal(amounts[projected[0] > projected[1] ? 0 : 1], 0);
  }
  assert.match(pointVertex, /scatterAmount\(originalClip\.x \/ originalClip\.w/);
  assert.match(depthFragment, /gl_FragCoord\.x \/ uViewportWidth/);
});

test('scan releases the left region first; aggregation restores right first', () => {
  assert.equal(scanAmount(0, .4, 1), 1);
  assert.equal(scanAmount(1, .4, 1), 0);
  assert.equal(scanAmount(0, .4, -1), 1);
  assert.equal(scanAmount(1, .4, -1), 0);
  for (let s = 0; s <= 1; s += .01) for (const jitter of [-.014, 0, .014]) {
    assert.equal(scanAmount(s, 0, 1, .22, jitter), 0);
    assert.equal(scanAmount(s, 1, 1, .22, jitter), 1);
    assert.equal(scanAmount(s, 1, -1, .22, jitter), 0);
  }
});
test('disabled transition cannot be restarted; a full cycle restores assembled', () => {
  const state = new ScanState(3.2);
  assert.equal(state.label, '散开'); assert.equal(state.start(), true);
  state.advance(1); const progress = state.progress;
  assert.equal(state.start(), false); assert.equal(state.progress, progress);
  state.advance(3.2); assert.equal(state.state, 'scattered'); assert.equal(state.label, '聚合');
  state.start(); state.advance(3.2);
  assert.equal(state.state, 'assembled'); assert.equal(state.mode, -1); assert.equal(state.progress, 1);
  assert.equal(state.label, '散开');
});
test('reduced motion completes each action immediately and consistently', () => {
  const state = new ScanState(CONFIG.SCAN_DURATION, CONFIG.AGGREGATE_DURATION); state.start(true);
  assert.equal(state.state, 'scattered'); assert.equal(state.running, false);
  state.start(true); assert.equal(state.state, 'assembled'); assert.equal(state.progress, 1);
});
test('first-pass scatter stays nearby, is repeatable, and preserves source coordinates', () => {
  const original = [35, 20, -25], before = [...original];
  for (let seed = 0; seed < 1000; seed++) {
    const result = scatterPosition(original, seed, CONFIG.SCATTER_DISTANCE);
    assert.deepEqual(result, scatterPosition(original, seed, CONFIG.SCATTER_DISTANCE));
    assert.ok(Math.hypot(...result.map((n, i) => n - original[i])) < CONFIG.SCATTER_DISTANCE * 1.45);
  }
  assert.deepEqual(original, before);
});
test('dissolve finishes faster while aggregation keeps its original duration', () => {
  const state = new ScanState(CONFIG.SCAN_DURATION, CONFIG.AGGREGATE_DURATION);
  state.start(); state.advance(CONFIG.SCAN_DURATION);
  assert.equal(state.state, 'scattered');
  state.start(); state.advance(CONFIG.SCAN_DURATION);
  assert.equal(state.state, 'assembling');
  state.advance(CONFIG.AGGREGATE_DURATION - CONFIG.SCAN_DURATION);
  assert.equal(state.state, 'assembled');
});
test('pitch clamps both extremes and accepts values inside limits', () => {
  assert.equal(clampPitch(-9, [-25, 30]), -25 * Math.PI / 180);
  assert.equal(clampPitch(9, [-25, 30]), 30 * Math.PI / 180);
  assert.equal(clampPitch(.1, [-25, 30]), .1);
});
test('all density binaries retain stable point identity and coordinates', () => {
  const read = file => { const b = readFileSync(new URL(`../public/models/bit-pointcloud-v5/${file}`, import.meta.url)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
  const full = parseBinary(read('points.bin'), 0x42545043, 10);
  const light = parseBinary(read('points-light.bin'), 0x42545043, 10);
  const sparse = parseBinary(read('points-sparse.bin'), 0x42545043, 10);
  const balanced = parseBinary(read('points-balanced.bin'), 0x42545043, 10);
  assert.equal(full.count, CONFIG.FULL_POINT_COUNT); assert.equal(light.count, CONFIG.LIGHT_POINT_COUNT);
  assert.equal(sparse.count, CONFIG.SPARSE_POINT_COUNT);
  assert.equal(balanced.count, CONFIG.POINT_COUNT);
  for (let i = 0; i < light.count; i++) for (let j = 0; j < 10; j++) assert.equal(light.data[i * 10 + j], full.data[i * 20 + j]);
  for (let i = 0; i < sparse.count; i++) for (let j = 0; j < 10; j++) assert.equal(sparse.data[i * 10 + j], full.data[i * 40 + j]);
  for (let i = 0; i < balanced.count; i++) for (let j = 0; j < 10; j++) {
    const sourceIndex = Math.floor(i * full.count / balanced.count);
    assert.equal(balanced.data[i * 10 + j], full.data[sourceIndex * 10 + j]);
  }
  for (const [name, data] of [['full', full], ['light', light], ['sparse', sparse], ['balanced', balanced]]) {
    assert.equal(CONFIG.POINT_VARIANTS[name].count, data.count);
  }
  const depth = parseBinary(read('depth.bin'), 0x42544450, 6);
  assert.equal(depth.count % 3, 0);
  assert.throws(() => parseBinary(read('points.bin').slice(0, 40), 0x42545043, 10));
});
