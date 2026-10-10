import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decodeGeometry } from '../src/wireframe-dual-preview/data.js';
import { classifyLines } from '../src/wireframe-transition-test/classification.js';
import { buildLinePaths } from '../src/wireframe-transition-test/paths.js';
import { prepareEducationLines, prepareEducationLayout } from '../src/components/educationPreparation.js';
import { EducationPreparationClient, EDUCATION_UPLOAD_BATCH } from '../src/components/educationPreparationClient.js';

const manifest = JSON.parse(readFileSync(new URL('../public/models/architectural-lines/manifest.json', import.meta.url)));
const readGeometry = (key, suffix, magic, stride) => {
  const bytes = readFileSync(new URL(`../public/models/architectural-lines/${key}-${suffix}.bin`, import.meta.url));
  return decodeGeometry(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), magic, stride);
};
test('worker preparation preserves every original edge, normal, CAD path and stable schedule across upload batches', () => {
  for (const key of ['bit', 'hive']) {
    const lines = readGeometry(key, 'lines', 0x57464C4E, 13), records = manifest[key].objects;
    const prepared = prepareEducationLines(key, lines, records);
    const classification = classifyLines(key, lines, records), paths = buildLinePaths(lines, records, classification.cad);
    assert.deepEqual(prepared.cadData, classification.cad);
    assert.deepEqual(prepared.cadArc, paths.arc); assert.deepEqual(prepared.cadAnchor, paths.anchor);
    assert.deepEqual(prepared.cadSchedule, paths.schedule);
    let drawn = 0;
    for (let start = 0; start < prepared.count; start += EDUCATION_UPLOAD_BATCH) {
      const end = Math.min(prepared.count, start + EDUCATION_UPLOAD_BATCH);
      for (let s = start; s < end; s++) {
        assert.deepEqual(prepared.endpoints.subarray(s * 6, s * 6 + 3), lines.subarray(s * 26, s * 26 + 3));
        assert.deepEqual(prepared.endpoints.subarray(s * 6 + 3, s * 6 + 6), lines.subarray(s * 26 + 13, s * 26 + 16));
        assert.deepEqual(prepared.faceA.subarray(s * 3, s * 3 + 3), lines.subarray(s * 26 + 6, s * 26 + 9));
        assert.deepEqual(prepared.faceB.subarray(s * 3, s * 3 + 3), lines.subarray(s * 26 + 9, s * 26 + 12));
        assert.equal(prepared.structural[s], lines[s * 26 + 12]);
      }
      drawn += end - start;
    }
    assert.equal(drawn, lines.length / 26);
    const surface = readGeometry(key, 'surface', 0x57465346, 3);
    const desktop = prepareEducationLayout(key, surface, 483 / 392);
    const phone = prepareEducationLayout(key, surface, 327 / 307, desktop.samples);
    assert.equal(phone.samples, desktop.samples);
    assert.deepEqual(phone.normalization.center, desktop.normalization.center);
    assert.ok(phone.framing.scale > 0); assert.ok(phone.framing.coverage <= .981);
  }
});

test('worker requests resolve by id and unmount cancels outstanding work safely', async () => {
  const original = globalThis.Worker;
  globalThis.Worker = class {
    postMessage(message) { this.last = message; }
    terminate() { this.terminated = true; }
  };
  try {
    const client = new EducationPreparationClient();
    const loaded = client.request('load', 1.2);
    client.worker.onmessage({ data: { id: client.worker.last.id, result: { models: [] } } });
    assert.deepEqual(await loaded, { models: [] });
    const pending = client.request('layout', .7);
    const rejected = assert.rejects(pending, { name: 'AbortError' });
    client.dispose(); client.dispose(); await rejected;
    assert.equal(client.worker.terminated, true); assert.equal(client.requests.size, 0);
    await assert.rejects(client.request('layout', 1), { name: 'AbortError' });
  } finally { globalThis.Worker = original; }
});
