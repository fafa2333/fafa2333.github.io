import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PerspectiveCamera, Matrix4, Vector3 } from 'three';
import { SWITCH } from '../src/pointcloud-switch-test/config.js';
import { SwitchState, switchSample } from '../src/pointcloud-switch-test/state.js';
import { switchPointVertex, switchPointFragment, switchDepthVertex, switchDepthFragment } from '../src/pointcloud-switch-test/shaders.js';
import { pointVertex, depthVertex } from '../src/pointcloud-test/shaders.js';
import { CONFIG } from '../src/pointcloud-test/config.js';
import { loadPointCloudModel } from '../src/pointcloud-test/point-cloud-model.js';
import { parseBinary } from '../src/pointcloud-test/core.js';
import { normalizePosition } from '../src/pointcloud-test/normalization.js';

test('both directions enforce dissolve, an empty 350ms gap, and assembly; repeated starts are refused', () => {
  const state = new SwitchState(SWITCH);
  for (const [from, to] of [['bit', 'hive'], ['hive', 'bit']]) {
    assert.equal(state.current, from); assert.equal(state.start(), true);
    assert.equal(state.phase, 'dissolving'); assert.equal(state.activeModel, from);
    state.advance(.45); assert.equal(state.progress, .5); assert.equal(state.start(), false);
    state.advance(.45); assert.equal(state.phase, 'blank'); assert.equal(state.activeModel, null);
    state.advance(.34); assert.equal(state.activeModel, null); assert.equal(state.start(), false);
    state.advance(.01); assert.equal(state.phase, 'assembling'); assert.equal(state.activeModel, to);
    state.advance(.5); assert.equal(state.progress, .5); assert.equal(state.start(), false);
    state.advance(.5); assert.equal(state.phase, 'idle'); assert.equal(state.current, to);
    assert.equal(state.activeModel, to); assert.equal(state.target, null);
  }
  assert.equal(state.switches, 2);
});

test('frame overshoot preserves total duration and reduced motion completes a single switch', () => {
  const state = new SwitchState(SWITCH); state.start(); state.advance(1.27);
  assert.equal(state.phase, 'assembling'); assert.ok(Math.abs(state.elapsed - .02) < 1e-8);
  state.advance(.98); assert.equal(state.phase, 'idle'); assert.equal(state.current, 'hive');
  state.start(true); assert.equal(state.current, 'bit'); assert.equal(state.switches, 2); assert.equal(state.running, false);
});

test('GPU scan opacity/displacement have exact endpoints and opposite local effects, both traveling left to right', () => {
  for (let x = 0; x <= 1; x += .01) for (const jitter of [-.014, 0, .014]) {
    assert.deepEqual(switchSample(x, 0, false, .22, jitter), { displacement: 0, opacity: 1 });
    assert.deepEqual(switchSample(x, 1, false, .22, jitter), { displacement: 1, opacity: 0 });
    assert.deepEqual(switchSample(x, 0, true, .22, jitter), { displacement: 1, opacity: 0 });
    assert.deepEqual(switchSample(x, 1, true, .22, jitter), { displacement: 0, opacity: 1 });
  }
  assert.equal(switchSample(0, .5, false).opacity, 0); assert.equal(switchSample(1, .5, false).opacity, 1);
  assert.equal(switchSample(0, .5, true).opacity, 1); assert.equal(switchSample(1, .5, true).opacity, 0);
  assert.match(switchPointFragment, /coverage \* vVisibility/);
  assert.match(switchPointVertex, /mix\(aOriginalPosition, aScatterPosition, amount\)/);
  assert.equal(switchDepthVertex, depthVertex);
  const sizing = source => source.slice(source.indexOf('  gl_PointSize ='), source.indexOf('  // In assembled'));
  assert.equal(sizing(switchPointVertex), sizing(pointVertex));
});

test('a 180 degree rotation changes which source is scanned first while screen ordering stays left to right', () => {
  const camera = new PerspectiveCamera(35, 1, .1, 1000);
  camera.position.set(0, 0, 160); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
  const view = new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  const originals = [new Vector3(-10, 0, 0), new Vector3(10, 0, 0)];
  for (const angle of [0, Math.PI]) {
    const matrix = view.clone().multiply(new Matrix4().makeRotationY(angle));
    const projected = originals.map(p => p.clone().applyMatrix4(matrix).x);
    const lo = Math.min(...projected), hi = Math.max(...projected);
    const values = projected.map(x => switchSample((x - lo) / (hi - lo), .5, true).opacity);
    assert.equal(values[projected[0] < projected[1] ? 0 : 1], 1);
    assert.equal(values[projected[0] > projected[1] ? 0 : 1], 0);
  }
  assert.match(switchPointVertex, /originalClip\.x \/ originalClip\.w/);
  assert.match(switchDepthFragment, /gl_FragCoord\.x \/ uViewportWidth/);
});

test('the shared model factory keeps original colors/radii and transforms source depth with the same normalization', async () => {
  const oldFetch = globalThis.fetch, models = [];
  globalThis.fetch = async path => new Response(readFileSync(new URL(`../public${path}`, import.meta.url)));
  try {
    for (const [name, info] of Object.entries(SWITCH.MODELS)) {
      const model = await loadPointCloudModel({ name, path: info.path, uniforms: {} }); models.push(model);
      model.normalize(1066 / 560, SWITCH.SCATTER_DISTANCE);
      const b = readFileSync(new URL(`../public${info.path}points-balanced.bin`, import.meta.url));
      const original = parseBinary(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), 0x42545043, 10);
      assert.equal(model.count, original.count);
      assert.ok(Math.abs(model.normalization.coverage - .7) < 1e-6);
      for (let i = 0; i < model.count; i += 991) {
        assert.equal(model.points.geometry.attributes.aRadius.array[i], original.data[i * 10 + 9]);
        for (let axis = 0; axis < 3; axis++) assert.equal(model.points.geometry.attributes.aInk.array[i * 3 + axis], original.data[i * 10 + 6 + axis]);
      }
      const d = readFileSync(new URL(`../public${info.path}depth.bin`, import.meta.url));
      const depth = parseBinary(d.buffer.slice(d.byteOffset, d.byteOffset + d.byteLength), 0x42544450, 6);
      const expected = normalizePosition(Array.from(depth.data.subarray(0, 3)), model.normalization);
      const actual = model.occluder.geometry.attributes.position.data.array;
      assert.ok(expected.every((v, axis) => Math.abs(v - actual[axis]) < 1e-5));
      const version = model.points.geometry.attributes.position.version;
      model.setAnimated(true); assert.equal(model.points.material.transparent, true);
      model.setAnimated(false); assert.equal(model.points.material.transparent, false);
      assert.equal(model.points.material.alphaToCoverage, true);
      assert.equal(model.points.geometry.attributes.position.version, version);
      assert.equal(model.root.visible, false);
    }
  } finally { for (const model of models) model.dispose(); globalThis.fetch = oldFetch; }
});
