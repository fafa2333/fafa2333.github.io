import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseBinary } from '../src/pointcloud-test/core.js';
import { CONFIG } from '../src/pointcloud-test/config.js';

const directory = new URL('../public/models/ntu-hive-pointcloud-v4/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.json', directory), 'utf8'));
const bit = JSON.parse(readFileSync(new URL('../public/models/bit-pointcloud-v5/manifest.json', import.meta.url), 'utf8'));
function read(name, magic = 0x42545043, stride = 10) {
  const b = readFileSync(new URL(name, directory));
  return parseBinary(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), magic, stride);
}

test('Hive inherits BIT density, color, radius, scan seed and quality retention', () => {
  for (const key of ['density', 'detailDensity', 'radius', 'seed', 'paper']) assert.equal(manifest[key], bit[key]);
  assert.deepEqual(manifest.parameterOverrides, {});
  assert.deepEqual(manifest.ink, ['#252724', '#646860']);
  assert.ok(manifest.maxNoise <= .100001);
  assert.equal(manifest.displayScale, 1);
  assert.equal(manifest.balancedRetention, bit.balanced.pointCount / bit.pointCount);
  assert.equal(manifest.variants.balanced.count, Math.round(manifest.pointCount * manifest.balancedRetention));
  assert.equal(manifest.objects.filter(o => o.object.startsWith('Hive_Tower_')).length, 12);
  for (const [key, variant] of Object.entries(manifest.variants)) {
    assert.equal(variant.radiusGain, CONFIG.POINT_VARIANTS[key].radiusGain);
  }
});

test('quality variants preserve exact original returns and source-depth geometry', () => {
  const full = read('points.bin');
  assert.equal(full.count, manifest.pointCount);
  for (const [key, variant] of Object.entries(manifest.variants)) {
    const subset = read(variant.file);
    assert.equal(subset.count, variant.count);
    for (let i = 0; i < subset.count; i++) {
      const source = key === 'balanced' ? Math.floor(i * full.count / subset.count)
        : key === 'light' ? i * 2 : key === 'sparse' ? i * 4 : i;
      for (let j = 0; j < 10; j++) assert.equal(subset.data[i * 10 + j], full.data[source * 10 + j]);
    }
  }
  const depth = read('depth.bin', 0x42544450, 6);
  assert.equal(depth.count, manifest.depthTriangles * 3);
  assert.equal(manifest.depthTriangles, 306066);
  for (let i = 0; i < full.count; i++) {
    const row = full.data.subarray(i * 10, (i + 1) * 10);
    assert.ok(Math.abs(Math.hypot(...row.subarray(3, 6)) - 1) < 1e-5);
    assert.ok(row[9] >= .09 * .88 - 1e-6 && row[9] <= .09 * 1.18 + 1e-6);
  }
});
