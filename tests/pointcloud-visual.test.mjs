import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { VISUAL, displayDensity } from '../src/pointcloud-switch-test/visual-config.js';
import { educationThemeCSS } from '../src/pointcloud-switch-test/theme-source.js';
import { SWITCH } from '../src/pointcloud-switch-test/config.js';
import { loadPointCloudModel } from '../src/pointcloud-test/point-cloud-model.js';

test('Education colors come from production CSS, including future variable declarations', () => {
  const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
  const theme = educationThemeCSS(css);
  const declared = css.match(/\.education-image \.image-panel[^}]+background: ([^;]+)/)[1];
  assert.ok(theme.includes(`${VISUAL.BACKGROUND_VARIABLE}: ${declared};`));
  assert.match(theme, /--paper:/); assert.doesNotMatch(theme, /height:|aspect-ratio:|font-family:/);
  assert.match(educationThemeCSS(css.replace(`background: ${declared}`, 'background: var(--paper)')), /--pointcloud-paper: var\(--paper\);/);
  assert.throws(() => educationThemeCSS(':root {--paper: white;}'), /Education/);
});

test('one continuous density rule adapts both buildings to narrow, card and large containers', () => {
  assert.equal(displayDensity(500), VISUAL.DENSITY[1].ratio);
  for (let w = 280; w <= 1440; w++) {
    assert.ok(displayDensity(w) > .3 && displayDensity(w) <= 1);
    assert.ok(displayDensity(w) >= displayDensity(w - 1));
    assert.ok(Math.abs(displayDensity(w) - displayDensity(w - 1)) < .002);
  }
});

test('optimized material remains the same object at every animation phase and never modifies returns', async () => {
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async path => new Response(readFileSync(new URL(`../public${path}`, import.meta.url)));
  try {
    for (const [name, info] of Object.entries(SWITCH.MODELS)) {
      const uniforms = {};
      const model = await loadPointCloudModel({ name, path: info.path, uniforms, continuousMaterial: true,
        materialOptions: { transparent: true, depthWrite: false, alphaToCoverage: false } });
      try {
        model.normalize(500 / (500 / VISUAL.CARD_ASPECT), SWITCH.SCATTER_DISTANCE);
        const material = model.points.material, points = model.points.geometry.attributes.position;
        const original = points.array.slice(), version = points.version;
        for (const moving of [true, true, false, true, false]) {
          model.setAnimated(moving);
          assert.equal(model.points.material, material); assert.equal(material.uniforms, uniforms);
          assert.equal(points.version, version); assert.deepEqual(points.array, original);
        }
        assert.equal(material.transparent, true); assert.equal(material.depthWrite, false);
      } finally { model.dispose(); }
    }
  } finally { globalThis.fetch = oldFetch; }
});
