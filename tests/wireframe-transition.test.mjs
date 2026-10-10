import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TRANSITION } from '../src/wireframe-transition-test/config.js';
import { TransitionTimeline } from '../src/wireframe-transition-test/timeline.js';
import { classifyLines } from '../src/wireframe-transition-test/classification.js';
import { cadMaterial, cadTrim } from '../src/wireframe-transition-test/line-material.js';
import { decodeGeometry } from '../src/wireframe-dual-preview/data.js';
import { architecturalMaterial } from '../src/wireframe-dual-preview/line-material.js';
import { ShaderLib } from 'three';
import { buildLinePaths, localStrokeProgress } from '../src/wireframe-transition-test/paths.js';

test('both directions use erase, blank and overlapping staggered draw stages in 2 seconds', () => {
  const timeline = new TransitionTimeline();
  assert.ok(Math.abs(timeline.total - 2) < 1e-9);
  for (const direction of ['bit-to-hive', 'hive-to-bit']) {
    assert.equal(timeline.start(), true, direction);
    assert.equal(timeline.start(), false);
    for (const [time, phase, visible] of [[0, 'erase', 'old'], [.849, 'erase', 'old'],
      [.85, 'pause', null], [.999, 'pause', null], [1, 'draw', 'new'],
      [1.5, 'draw', 'new'], [1.999, 'draw', 'new']]) {
      timeline.advance(time - timeline.elapsed);
      assert.equal(timeline.snapshot.phase, phase, `${direction} ${time}`);
      assert.equal(timeline.snapshot.visible, visible);
      assert.ok(timeline.snapshot.progress >= 0 && timeline.snapshot.progress <= 1);
    }
    timeline.advance(.001);
    assert.equal(timeline.running, false);
    assert.equal(timeline.snapshot.phase, 'idle');
  }
});

test('a reduced-motion finish and frame overrun always restore one complete model', () => {
  const timeline = new TransitionTimeline(); timeline.start(); timeline.advance(.5); timeline.finish();
  assert.equal(timeline.running, false); assert.equal(timeline.snapshot.visible, 'current');
  timeline.start(); timeline.advance(10); assert.equal(timeline.snapshot.phase, 'idle');
  timeline.start(); timeline.advance(-1); assert.equal(timeline.elapsed, 0);
});

test('real BIT windows/floor bands and Hive intermediate tower ribs retain reusable detail tags', () => {
  const manifest = JSON.parse(readFileSync(new URL('../public/models/architectural-lines/manifest.json', import.meta.url)));
  for (const model of ['bit', 'hive']) {
    const bytes = readFileSync(new URL(`../public/models/architectural-lines/${model}-lines.bin`, import.meta.url));
    const lines = decodeGeometry(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), 0x57464C4E, 13);
    const before = lines.slice();
    const { cad, counts } = classifyLines(model, lines, manifest[model].objects);
    const paths = buildLinePaths(lines, manifest[model].objects, cad);
    assert.ok(paths.stats.multiSegmentPaths > 0);
    assert.ok(paths.stats.forwardPaths > 0 && paths.stats.reversePaths > 0);
    assert.ok(paths.stats.minDuration >= TRANSITION.LINE_MIN_DURATION && paths.stats.maxDuration <= TRANSITION.LINE_MAX_DURATION);
    assert.equal(paths.arc.length, lines.length / 13);
    assert.ok(paths.arc.every(value => value >= 0 && value <= 1));
    assert.deepEqual(lines, before);
    assert.equal(counts.outline + counts.primary + counts.detail, lines.length / 26);
    assert.ok(counts.primary > 0 && counts.detail > 0 && counts.outline > 0);
    for (let i = 0; i < cad.length; i += 3) {
      assert.ok([0, 1, 2].includes(cad[i]));
      assert.ok(cad[i + 1] >= 0 && cad[i + 1] <= 1);
      assert.ok(cad[i + 2] >= 0 && cad[i + 2] <= 1);
    }
    if (model === 'bit') for (const object of manifest.bit.objects.filter(o => /WindowModules|ContinuousFloorHeaders/.test(o.name))) {
      for (let s = object.segment_start; s < object.segment_start + object.segment_count; s++) assert.equal(cad[s * 3], 2);
    }
    if (model === 'hive') {
      const towers = manifest.hive.objects.filter(o => o.role === 'rounded_tower');
      assert.equal(towers.length, 12);
      for (const tower of towers) {
        let detailCount = 0, primaryCount = 0;
        for (let s = tower.segment_start; s < tower.segment_start + tower.segment_count; s++) {
          if (cad[s * 3] === 2) detailCount++; else primaryCount++;
        }
        assert.ok(detailCount > 0 && primaryCount > 0, tower.name);
      }
    }
  }
});

test('CAD extends actual endpoints in camera space and retains the original silhouette/depth/line style', () => {
  const material = cadMaterial(), baseline = architecturalMaterial();
  for (const key of ['linewidth', 'transparent', 'depthTest', 'depthWrite', 'alphaToCoverage']) assert.equal(material[key], baseline[key]);
  assert.equal(material.color.getHex(), baseline.color.getHex());
  const shader = { vertexShader: ShaderLib.line.vertexShader, fragmentShader: ShaderLib.line.fragmentShader, uniforms: {} };
  material.onBeforeCompile(shader);
  assert.match(shader.vertexShader, /facingA \* facingB < 0\.0/);
  assert.match(shader.vertexShader, /projectedAnchor\.x \/ projectedAnchor\.w/);
  assert.match(shader.vertexShader, /end = mix\(start, end, safePath\)/);
  assert.match(shader.fragmentShader, /cadVisible < \.00001/);
  assert.match(shader.fragmentShader, /lineVisible < \.5/);
  assert.ok(shader.vertexShader.indexOf(cadTrim) < shader.vertexShader.indexOf('// clip space'));
  assert.equal(shader.uniforms.uScanSign.value, 1);
  assert.equal(TRANSITION.SCAN_DIRECTION, 'left_to_right');
  assert.match(shader.vertexShader, /front - first/);
  assert.match(shader.vertexShader, /cadSchedule\.w > \.5/);
  assert.doesNotMatch(shader.vertexShader, /detailStage|screenOrder\s*[<>]/);
  material.dispose(); baseline.dispose();
});

function lineData(segments) {
  const lines = new Float32Array(segments.length * 26);
  segments.forEach(([a, b], i) => { lines.set(a, i * 26); lines.set(b, i * 26 + 13); });
  return lines;
}

test('connected curved strokes share a stable clock and continuous cumulative arc, including reversed duplicates', () => {
  const lines = lineData([[[0, 5, 0], [1, 5, 0]], [[2, 5, .2], [1, 5, 0]],
    [[2, 5, .2], [3, 5, .6]], [[1, 5, 0], [0, 5, 0]]]);
  const before = lines.slice(), cad = new Float32Array(12), records = [{ name: 'curve', segment_start: 0, segment_count: 4 }];
  const paths = buildLinePaths(lines, records, cad);
  assert.deepEqual(lines, before);
  assert.equal(paths.stats.paths, 1); assert.equal(paths.stats.uniqueEdges, 3);
  assert.equal(paths.stats.maxSegments, 3);
  assert.deepEqual(paths, buildLinePaths(lines, records, cad));
  for (let i = 1; i < 4; i++) assert.deepEqual(paths.schedule.slice(i * 4, i * 4 + 4), paths.schedule.slice(0, 4));
  assert.equal(paths.arc[1], paths.arc[3]); assert.equal(paths.arc[2], paths.arc[4]);
  assert.equal(paths.arc[6], paths.arc[1]); assert.equal(paths.arc[7], paths.arc[0]);
  for (const reverse of [false, true]) for (const progress of [0, .1, .4, .7, 1]) {
    let growing = 0;
    for (let i = 0; i < 3; i++) {
      const fraction = localStrokeProgress(progress, paths.arc[i * 2], paths.arc[i * 2 + 1], reverse);
      if (fraction > 0 && fraction < 1) growing++;
      if (progress === 0) assert.equal(fraction, 0);
      if (progress === 1) assert.equal(fraction, 1);
    }
    assert.ok(growing <= 1, 'Only one pen tip may advance along this connected curve');
  }
});

test('four-way crossings preserve two independent straight strokes and closed curves use one loop clock', () => {
  const crossing = lineData([[[-1, 0, 0], [0, 0, 0]], [[0, 0, 0], [1, 0, 0]],
    [[0, 0, -1], [0, 0, 0]], [[0, 0, 0], [0, 0, 1]]]);
  assert.equal(buildLinePaths(crossing, [{ name: 'crossing', segment_start: 0, segment_count: 4 }], new Float32Array(12)).stats.paths, 2);
  const point = i => [Math.cos(i * Math.PI / 32), 20, Math.sin(i * Math.PI / 32)];
  const loop = lineData(Array.from({ length: 64 }, (_, i) => [point(i), point(i + 1)]));
  const paths = buildLinePaths(loop, [{ name: 'ring', segment_start: 0, segment_count: 64 }], new Float32Array(192));
  assert.equal(paths.stats.paths, 1); assert.equal(paths.stats.maxSegments, 64);
  assert.ok(Math.abs(paths.stats.maxLength - 2 * Math.PI) < .01);
});
