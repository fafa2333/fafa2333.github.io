import test from 'node:test';
import assert from 'node:assert/strict';
import { Group, Vector3 } from 'three';
import { YawMotion, HorizontalRotation } from '../src/wireframe-dual-preview/rotation.js';
import { ROTATION, LINE_STYLE } from '../src/wireframe-dual-preview/config.js';

class Canvas extends EventTarget {
  dataset = {}; captures = new Set();
  setPointerCapture(id) { this.captures.add(id); }
  hasPointerCapture(id) { return this.captures.has(id); }
  releasePointerCapture(id) { this.captures.delete(id); }
  pointer(type, x, y, time, pointerType = 'mouse') {
    const event = new Event(type, { cancelable: true });
    Object.defineProperties(event, Object.fromEntries(Object.entries({ clientX: x, clientY: y,
      pointerId: 1, isPrimary: true, button: 0, timeStamp: time, pointerType }).map(([k, value]) => [k, { value }])));
    this.dispatchEvent(event); return event;
  }
}
function controller(model = 'bit', matches = false) {
  const canvas = new Canvas(), reduced = { matches };
  const rotation = new HorizontalRotation(canvas, { model, ready: () => true, reduced, wake() {} });
  return { canvas, reduced, rotation };
}

test('one full automatic revolution takes 120 seconds at every frame rate and is counterclockwise in the fixed camera projection', () => {
  for (const fps of [30, 60, 144]) for (const model of ['bit', 'hive']) {
    const motion = new YawMotion(model), start = motion.yaw;
    for (let i = 0; i < fps * 120; i++) motion.update(1 / fps);
    assert.ok(Math.abs(motion.yaw - start - Math.PI * 2) < 1e-9);
  }
  const direction = new Vector3(...LINE_STYLE.cameraDirection).normalize();
  assert.ok(Math.abs(Math.asin(direction.y) * 180 / Math.PI - 28) < 1e-10);
  const right = new Vector3().crossVectors(new Vector3(0, 1, 0), direction).normalize();
  const up = new Vector3().crossVectors(direction, right).normalize();
  const near = new Vector3(direction.x, 0, direction.z).normalize();
  const rotated = near.clone().applyAxisAngle(new Vector3(0, 1, 0), .001);
  const before = [near.dot(right), near.dot(up)], after = [rotated.dot(right), rotated.dot(up)];
  assert.ok(before[0] * after[1] - before[1] * after[0] > 0);
});

test('vertical dragging holds pitch/roll fixed; horizontal dragging affects only its own Y-axis group', () => {
  const left = controller(), right = controller('hive');
  const a = new Group(), b = new Group(), start = left.rotation.yaw;
  left.canvas.pointer('pointerdown', 100, 100, 0);
  left.canvas.pointer('pointermove', 100, 180, 100);
  left.rotation.update(2, a); right.rotation.update(2, b);
  assert.equal(left.rotation.yaw, start);
  assert.ok(right.rotation.yaw > ROTATION.initialDegrees.hive * Math.PI / 180);
  left.canvas.pointer('pointermove', 200, 240, 200);
  left.rotation.update(1, a);
  assert.ok(Math.abs(left.rotation.yaw - start - 100 * ROTATION.radiansPerPixel) < 1e-12);
  assert.equal(a.rotation.x, 0); assert.equal(a.rotation.z, 0);
  assert.equal(left.rotation.pitch, 0);
  assert.deepEqual(new Vector3(0, 1, 0).applyQuaternion(a.quaternion).toArray(), [0, 1, 0]);
  left.rotation.dispose(); right.rotation.dispose();
});

test('release preserves angle and smoothly converges from either drag direction to 3 degrees per second', () => {
  for (const pixels of [-100, 100, 0]) {
    const motion = new YawMotion('hive'); motion.begin(); motion.drag(pixels, .08);
    const end = motion.yaw, velocity = motion.velocity;
    motion.release(); assert.equal(motion.yaw, end); assert.equal(motion.velocity, velocity);
    motion.update(.001);
    assert.ok(Math.abs(motion.velocity - velocity) < .02);
    motion.update(2);
    assert.ok(Math.abs(motion.velocity - motion.autoSpeed) < 1e-6);
    const after = motion.yaw; motion.update(1);
    assert.ok(Math.abs(motion.yaw - after - motion.autoSpeed) < 1e-7);
  }
});

test('touch vertical gestures remain uncancelled for scrolling, and horizontal gestures capture only after axis intent is clear', () => {
  const { canvas, rotation } = controller(); const start = rotation.yaw;
  assert.equal(canvas.pointer('pointerdown', 100, 100, 0, 'touch').defaultPrevented, false);
  assert.equal(canvas.hasPointerCapture(1), false);
  assert.equal(canvas.pointer('pointermove', 102, 125, 100, 'touch').defaultPrevented, false);
  assert.equal(rotation.yaw, start); assert.equal(rotation.motion.dragging, false);
  canvas.pointer('pointerdown', 100, 100, 200, 'touch');
  assert.equal(canvas.pointer('pointermove', 130, 102, 300, 'touch').defaultPrevented, true);
  assert.ok(rotation.yaw > start); assert.equal(canvas.hasPointerCapture(1), true);
  canvas.pointer('pointercancel', 130, 102, 350, 'touch');
  assert.equal(canvas.hasPointerCapture(1), false); assert.equal(rotation.motion.dragging, false);
  rotation.dispose();
});

test('reduced motion stops auto rendering while retaining manual horizontal control and no release inertia', () => {
  const { canvas, rotation } = controller('bit', true); const group = new Group(), start = rotation.yaw;
  rotation.update(60, group); assert.equal(rotation.yaw, start); assert.equal(rotation.moving, false);
  canvas.pointer('pointerdown', 100, 100, 0); canvas.pointer('pointermove', 140, 180, 100);
  canvas.pointer('pointerup', 140, 180, 110); const manual = rotation.yaw;
  assert.ok(manual > start); rotation.update(60, group); assert.equal(rotation.yaw, manual);
  assert.equal(rotation.motion.velocity, 0); rotation.dispose();
});
