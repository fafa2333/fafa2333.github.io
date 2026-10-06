import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { GEARS, MODULE, NORMAL_SPEED, toothOutline, draftingGuides, gearLayout, interpolatePose } from '../src/hero/gearGeometry.js';
import { resourceGate, lockIntroScroll } from '../src/hero/introLifecycle.js';
import { createGearScene } from '../src/hero/createGearScene.js';
import { createIntroGrid } from '../src/hero/createIntroGrid.js';
import { HERO_GRID } from '../src/components/gridGeometry.js';

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);
test('original gear tooth count, common module and opposite 30:20 transmission', () => {
  for (const gear of GEARS) {
    const points = toothOutline(gear.teeth);
    assert.equal(points.length, gear.teeth * 27);
    near(Math.max(...points.map(([x, y]) => Math.hypot(x, y))), gear.teeth * MODULE / 2 + MODULE);
  }
  near(GEARS[0].teeth * GEARS[0].speed + GEARS[1].teeth * GEARS[1].speed, 0);
  near(GEARS[0].x - GEARS[1].x, MODULE * (GEARS[0].teeth + GEARS[1].teeth) / 2);
});
test('neutral pose reproduces the original video centers and projection', () => {
  const pose = interpolatePose(gearLayout(1440, 900, false), 1);
  near(pose.x + pose.a * 150, 1165); near(pose.y + pose.b * 150, 450);
  near(pose.x - pose.a * 150, 901); near(pose.y - pose.b * 150, 345);
  near(pose.c, -.32); near(pose.d, .74); near(pose.depthY, -28);
});
test('front-view intro fits small phones and short desktop windows', () => {
  for (const [w, h, mobile] of [[320, 880, true], [390, 880, true], [760, 880, true], [1176, 905, false], [1440, 616, false]]) {
    const pose = interpolatePose(gearLayout(w, h, mobile), 0);
    assert.ok(pose.x - 282 * pose.scale >= 0);
    assert.ok(pose.x + 342 * pose.scale <= w);
    assert.ok(pose.y - 192 * pose.scale >= 0);
    assert.ok(pose.y + 192 * pose.scale <= h);
  }
});
function gateHarness(resource) {
  let deadline, canceled = 0, calls = 0;
  const gate = resourceGate(resource, (_, callback) => { deadline = callback; return () => canceled++; }, () => calls++);
  return { gate, expire: () => deadline(), calls: () => calls, canceled: () => canceled };
}
test('fast font readiness releases once and cancels the deadline', async () => {
  const h = gateHarness(Promise.resolve()); await Promise.resolve();
  assert.equal(h.gate.ready(), true); assert.equal(h.calls(), 1); assert.equal(h.canceled(), 1);
  h.expire(); assert.equal(h.calls(), 1);
});
test('failed font switches to fallback rather than leaving the intro paused', async () => {
  const h = gateHarness(Promise.reject(new Error('font unavailable'))); await Promise.resolve();
  assert.equal(h.gate.ready(), true); assert.equal(h.calls(), 1);
});
test('never-loading and late fonts have a bounded, single handoff', async () => {
  let resolve; const h = gateHarness(new Promise(r => { resolve = r; }));
  assert.equal(h.gate.ready(), false); h.expire(); assert.equal(h.calls(), 1);
  resolve(); await Promise.resolve(); assert.equal(h.calls(), 1);
});
test('unmount/StrictMode cleanup cancels a pending resource handoff', async () => {
  const h = gateHarness(Promise.resolve()); h.gate.dispose(); await Promise.resolve(); h.expire();
  assert.equal(h.calls(), 0);
});
test('scroll unlock restores both original overflow values and priorities exactly', () => {
  const style = (value, priority) => ({ value, priority,
    getPropertyValue() { return this.value; }, getPropertyPriority() { return this.priority; },
    set overflow(value) { this.value = value; }, setProperty(_, value, priority) { this.value = value; this.priority = priority; } });
  const doc = { documentElement: { style: style('auto', 'important') }, body: { style: style('clip', '') } };
  const unlock = lockIntroScroll(doc); assert.equal(doc.body.style.value, 'hidden');
  unlock(); unlock(); assert.equal(doc.body.style.value, 'clip'); assert.equal(doc.documentElement.style.value, 'auto'); assert.equal(doc.documentElement.style.priority, 'important');
});
test('same cached geometry and accumulated angle survive drawing-to-hero handoff', () => {
  let paths = 0;
  globalThis.Path2D = class { constructor() { paths++; } moveTo() {} lineTo() {} closePath() {} };
  globalThis.window = { devicePixelRatio: 1, matchMedia: () => ({ matches: false }) };
  const ctx = new Proxy({}, { get: (_, name) => typeof name === 'string' ? () => {} : undefined, set: () => true });
  const scene = createGearScene({ getContext: () => ctx, clientWidth: 1440, clientHeight: 900, getBoundingClientRect: () => ({top: 0}) });
  scene.resize(); const cached = paths;
  scene.state.speed = .5; scene.advance(.4); const before = scene.angle();
  Object.assign(scene.state, { mix: 1, draw: 1, smallDraw: 1, speed: 1 });
  near(scene.angle(), before); scene.advance(1 / 60); near(scene.angle() - before, NORMAL_SPEED / 60);
  scene.render(); scene.resize(); assert.equal(paths, cached);
  delete globalThis.window; delete globalThis.Path2D;
});

test('all outline vertices match the existing Python video generator', () => {
  const original = JSON.parse(execFileSync('python3', ['-c', `
import ast, math, json
source = ast.parse(open('scripts/render-hero-gears.py').read())
functions = [node for node in source.body if isinstance(node, ast.FunctionDef) and node.name in ['polar', 'involute', 'tooth_outline']]
namespace = {'math': math, 'MODULE': 12, 'PRESSURE_ANGLE': math.radians(20)}
exec(compile(ast.Module(body=functions, type_ignores=[]), '<original-gears>', 'exec'), namespace)
print(json.dumps([namespace['tooth_outline'](n) for n in [30, 20]]))
`], {encoding: 'utf8'}));
  [30, 20].forEach((teeth, n) => {
    const actual = toothOutline(teeth);
    assert.equal(actual.length, original[n].length);
    actual.forEach((point, i) => point.forEach((value, axis) => near(value, original[n][i][axis])));
  });
});

test('intro stays inside short and landscape viewports even when the hero has a minimum height', () => {
  for (const [w, canvasHeight, viewportHeight, top, mobile] of [[568, 880, 320, -24, true], [320, 880, 568, -24, true], [1024, 770, 375, -21, false]]) {
    const pose = interpolatePose(gearLayout(w, canvasHeight, mobile, viewportHeight, top), 0);
    assert.ok(pose.y + top - 192 * pose.scale >= 0);
    assert.ok(pose.y + top + 192 * pose.scale <= viewportHeight);
  }
});

test('intro assembly is centered with the small gear above-left, including phone and landscape framing', () => {
  for (const [w, h, viewHeight, top, mobile] of [[1280, 792, 720, 24, false], [390, 928, 844, -24, true], [320, 880, 568, -24, true], [568, 880, 320, -24, true]]) {
    const p = interpolatePose(gearLayout(w, h, mobile, viewHeight, top), 0);
    const centers = GEARS.map(g => [p.x + p.scale * p.a * g.x, p.y + top + p.scale * p.b * g.x]);
    assert.ok(centers[1][0] < centers[0][0]); assert.ok(centers[1][1] < centers[0][1]);
    near(Math.hypot(centers[1][0] - centers[0][0], centers[1][1] - centers[0][1]), 300 * p.scale);
    const radii = GEARS.map(g => (MODULE * g.teeth / 2 + MODULE) * p.scale);
    near((Math.min(...centers.map((c, n) => c[0] - radii[n])) + Math.max(...centers.map((c, n) => c[0] + radii[n]))) / 2, w / 2);
    near((Math.min(...centers.map((c, n) => c[1] - radii[n])) + Math.max(...centers.map((c, n) => c[1] + radii[n]))) / 2, viewHeight / 2);
    GEARS.forEach(g => draftingGuides(g.teeth * MODULE / 2).forEach(guide => guide.points.forEach(([x, y]) => {
      const px = p.x + p.scale * (p.a * (x + g.x) + p.c * y);
      const py = p.y + top + p.scale * (p.b * (x + g.x) + p.d * y);
      assert.ok(px >= 0 && px <= w && py >= 0 && py <= viewHeight);
    })));
  }
});

test('static intro grid matches the existing cursor cell borders exactly and releases its bitmap', () => {
  globalThis.window = { devicePixelRatio: 2 };
  for (const [w, h] of [[1280, 720], [1176, 823], [391, 845], [568, 800]]) {
    const rects = [];
    const ctx = { setTransform() {}, beginPath() {}, stroke() {}, rect(...values) { rects.push(values); } };
    const canvas = { getContext: () => ctx, offsetWidth: w, offsetHeight: h };
    const grid = createIntroGrid(canvas); grid.resize();
    const cols = Math.ceil(w / 112) + 1, rows = Math.ceil(h / 112) + 1;
    assert.equal(rects.length, cols * rows);
    rects.forEach(([x, y, width, height], n) => {
      // The original CursorGrid center-minus-half formula, before extraction.
      near(x, (w - cols * 112) / 2 + n % cols * 112 + .5);
      near(y, (h - rows * 112) / 2 + Math.floor(n / cols) * 112 + .5);
      assert.equal(width, 111); assert.equal(height, 111);
    });
    assert.equal(ctx.strokeStyle, HERO_GRID.color); assert.equal(ctx.lineWidth, HERO_GRID.lineWidth);
    grid.dispose(); grid.resize(); assert.equal(canvas.width, 0); assert.equal(canvas.height, 0);
    assert.equal(rects.length, cols * rows);
  }
  delete globalThis.window;
});
