import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decodeGeometry } from '../src/wireframe-dual-preview/data.js';
import { LINE_STYLE } from '../src/wireframe-dual-preview/config.js';
import { calculateNormalization, cameraBasis } from '../src/pointcloud-test/normalization.js';
import { framingSamples, buildEducationFraming, framingOffset } from '../src/components/educationFraming.js';

test('both real models fit a full turn around a stationary anchor, on desktop and mobile', () => {
  const basis = cameraBasis(LINE_STYLE.cameraDirection), tangent = Math.tan(35 * Math.PI / 360);
  for (const key of ['bit', 'hive']) {
    const bytes = readFileSync(new URL(`../public/models/architectural-lines/${key}-surface.bin`, import.meta.url));
    const positions = decodeGeometry(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), 0x57465346, 3);
    for (const aspect of [486 / 392, 346 / 307]) {
      const settings = { aspect, direction: LINE_STYLE.cameraDirection, distance: 160, fov: 35, targetCoverage: .90, scaleMultiplier: 1 };
      const original = calculateNormalization(positions, settings);
      const framing = buildEducationFraming(framingSamples(positions, original.center), original, settings, key);
      assert.ok(framing.scale > 0 && Number.isFinite(framing.scale));
      for (let step = 0; step < 24; step++) {
        // Check poses between the sampled fitting angles as well.
        const yaw = step * Math.PI / 12 + .025, c = Math.cos(yaw), s = Math.sin(yaw), offset = framingOffset(framing, yaw);
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (let i = 0; i < positions.length; i += 27) {
          const px = (positions[i] - original.center[0]) * framing.scale;
          const py = (positions[i + 1] - original.center[1]) * framing.scale;
          const pz = (positions[i + 2] - original.center[2]) * framing.scale;
          const x = px * c + pz * s + offset[0], y = py + offset[1], z = -px * s + pz * c + offset[2];
          const depth = 160 - x * basis.forward[0] - y * basis.forward[1] - z * basis.forward[2];
          const screenX = (x * basis.right[0] + y * basis.right[1] + z * basis.right[2]) / (depth * tangent * aspect);
          const screenY = (x * basis.up[0] + y * basis.up[1] + z * basis.up[2]) / (depth * tangent);
          minX = Math.min(minX, screenX); maxX = Math.max(maxX, screenX);
          minY = Math.min(minY, screenY); maxY = Math.max(maxY, screenY);
        }
        assert.ok(Math.max(Math.abs(minX), Math.abs(maxX), Math.abs(minY), Math.abs(maxY)) < .995, `${key} must not clip`);
        assert.ok(Math.max(Math.abs(minX + maxX), Math.abs(minY + maxY)) / 2 < .18, `${key} remains near the visual center`);
      }
      for (const yaw of [-.2, 0, 3, 7]) {
        const a = framingOffset(framing, yaw), b = framingOffset(framing, yaw + 2 * Math.PI);
        assert.deepEqual(a, b);
        assert.deepEqual(a, framingOffset(framing, 0), 'rotation cannot translate the model');
      }
    }
  }
});
