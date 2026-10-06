import test from 'node:test';
import assert from 'node:assert/strict';
import { ParallaxController } from '../src/components/ParallaxController.js';

class Target extends EventTarget {
  listeners = new Map();
  addEventListener(type, callback, options) {
    super.addEventListener(type, callback, options);
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(callback);
  }
  removeEventListener(type, callback) { super.removeEventListener(type, callback); this.listeners.get(type)?.delete(callback); }
  emit(type, values = {}) { this.dispatchEvent(Object.assign(new Event(type), values)); }
}
function fixture(API = class {}, coarse = false) {
  const env = new Target(), surface = new Target(), states = [];
  Object.assign(env, { DeviceOrientationEvent: API, isSecureContext: true, innerWidth: 1000, innerHeight: 800,
    document: { hidden: false }, screen: { orientation: Object.assign(new Target(), { angle: 0 }) },
    matchMedia: () => ({ matches: coarse }), setTimeout: () => 1, clearTimeout: () => {} });
  let wakes = 0;
  const controller = new ParallaxController({ surface, environment: env, wake: () => wakes++, onMotion: state => states.push(state) });
  controller.setActivity(true, false);
  return { controller, env, surface, states, wakes: () => wakes };
}

test('desktop input eases, settles, and returns to neutral after leaving', () => {
  const { controller: c, surface } = fixture();
  surface.emit('pointermove', { pointerType: 'mouse', clientX: 900, clientY: 160 });
  assert.deepEqual(c.target, { x: .8, y: .6 });
  assert.equal(c.current.x, 0); c.step(1000);
  assert.ok(c.current.x > 0 && c.current.x < .08);
  for (let i = 1; i < 200; i++) c.step(1000 + i * 1000 / 60);
  assert.equal(c.current.x, .8);
  surface.emit('pointerleave');
  for (let i = 0; i < 200; i++) c.step(5000 + i * 1000 / 60);
  assert.deepEqual(c.current, { x: 0, y: 0 });
  assert.equal(c.step(9000), false); c.dispose();
});
test('permission is requested only by an explicit action, and denial is harmless', async () => {
  let requests = 0;
  const { controller: c, env, states } = fixture(class { static async requestPermission() { requests++; return 'denied'; } }, true);
  assert.equal(requests, 0); await c.toggleMotion();
  assert.equal(requests, 1); assert.equal(states.at(-1), 'denied');
  assert.equal(c.enabled, false); assert.equal(env.listeners.get('deviceorientation')?.size || 0, 0); c.dispose();
});
test('calibration uses the first viewing posture, filters noise, clamps extremes and recalibrates on rotation', async () => {
  const { controller: c, env } = fixture(class { static async requestPermission() { return 'granted'; } }, true);
  await c.toggleMotion();
  env.emit('deviceorientation', { beta: 55, gamma: 8 }); assert.deepEqual(c.target, { x: 0, y: 0 });
  env.emit('deviceorientation', { beta: 55.2, gamma: 8.3 }); assert.deepEqual(c.target, { x: 0, y: 0 });
  env.emit('deviceorientation', { beta: 120, gamma: 80 });
  assert.ok(c.target.x > 0 && c.target.x < .2); assert.ok(c.target.y < 0 && c.target.y > -.2);
  for (let i = 0; i < 100; i++) env.emit('deviceorientation', { beta: 120, gamma: 80 });
  assert.ok(Math.abs(c.target.x) <= 1 && Math.abs(c.target.y) <= 1);
  env.screen.orientation.angle = 90; env.screen.orientation.emit('change');
  env.emit('deviceorientation', { beta: 70, gamma: -15 }); assert.deepEqual(c.target, { x: 0, y: 0 }); c.dispose();
});
test('offscreen, hidden-page and reduced-motion states suspend input and remove sensors', async () => {
  const { controller: c, env, surface, wakes } = fixture(class {}, true);
  await c.toggleMotion(); assert.equal(env.listeners.get('deviceorientation').size, 1);
  c.setActivity(false, false); assert.equal(env.listeners.get('deviceorientation').size, 0);
  const count = wakes(); env.emit('deviceorientation', { beta: 20, gamma: 10 }); assert.equal(wakes(), count);
  c.setActivity(true, false); assert.equal(env.listeners.get('deviceorientation').size, 1);
  env.document.hidden = true; c.setActivity(true, false); assert.equal(env.listeners.get('deviceorientation').size, 0);
  env.document.hidden = false; c.setActivity(true, true); assert.equal(c.active, false);
  surface.emit('pointermove', { pointerType: 'touch', clientX: 100, clientY: 100 });
  assert.deepEqual(c.target, { x: 0, y: 0 }); c.dispose();
  assert.equal(surface.listeners.get('pointermove').size, 0); assert.equal(env.screen.orientation.listeners.get('change').size, 0);
});
test('missing API, insecure origin and reduced-motion all keep motion disabled', async () => {
  const { controller: c, env, states } = fixture(null, true);
  await c.toggleMotion(); assert.equal(states.at(-1), 'unavailable');
  env.DeviceOrientationEvent = class {}; env.isSecureContext = false;
  await c.toggleMotion(); assert.equal(states.at(-1), 'unavailable');
  c.setActivity(true, true); await c.toggleMotion(); assert.equal(states.at(-1), 'reduced'); c.dispose();
});
test('damping remains consistent across refresh rates', () => {
  const sample = fps => {
    const { controller: c } = fixture(); c.setInput(1, .5); c.step(1000);
    for (let i = 1; i <= fps; i++) c.step(1000 + i * 1000 / fps);
    const x = c.current.x; c.dispose(); return x;
  };
  assert.ok(Math.abs(sample(30) - sample(60)) < .0001);
});
test('focus weakens parallax smoothly and restores it without a gain jump', () => {
  const { controller: c } = fixture();
  c.setFocus(true); assert.equal(c.gain, 1); c.step(1000);
  assert.ok(c.gain < 1 && c.gain > .9);
  for (let i = 1; i < 200; i++) c.step(1000 + i * 1000 / 60);
  assert.equal(c.gain, .2); c.setFocus(false); assert.equal(c.gain, .2);
  for (let i = 0; i < 200; i++) c.step(5000 + i * 1000 / 60);
  assert.equal(c.gain, 1); c.dispose();
});
