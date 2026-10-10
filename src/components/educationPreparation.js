import { classifyLines } from '../wireframe-transition-test/classification.js';
import { buildLinePaths } from '../wireframe-transition-test/paths.js';
import { calculateNormalization } from '../pointcloud-test/normalization.js';
import { LINE_STYLE } from '../wireframe-dual-preview/config.js';
import { framingSamples, buildEducationFraming } from './educationFraming.js';

// Pure CPU work: worker and offline verification share the same source logic.
export function prepareEducationLayout(key, surface, aspect, samples) {
  const settings = { aspect, direction: LINE_STYLE.cameraDirection,
    distance: LINE_STYLE.cameraDistance, fov: LINE_STYLE.fov };
  const normalization = calculateNormalization(surface, { ...settings, targetCoverage: .90, ...LINE_STYLE.models[key] });
  samples ||= framingSamples(surface, normalization.center);
  return { normalization, framing: buildEducationFraming(samples, normalization, settings, key), samples };
}

export function prepareEducationLines(key, lines, records) {
  const count = lines.length / 26;
  const endpoints = new Float32Array(count * 6), faceA = new Float32Array(count * 3),
    faceB = new Float32Array(count * 3), structural = new Float32Array(count);
  for (let s = 0; s < count; s++) {
    const i = s * 26;
    endpoints.set(lines.subarray(i, i + 3), s * 6);
    endpoints.set(lines.subarray(i + 13, i + 16), s * 6 + 3);
    faceA.set(lines.subarray(i + 6, i + 9), s * 3);
    faceB.set(lines.subarray(i + 9, i + 12), s * 3); structural[s] = lines[i + 12];
  }
  const classification = classifyLines(key, lines, records);
  const paths = buildLinePaths(lines, records, classification.cad);
  return { count, endpoints, faceA, faceB, structural, cadData: classification.cad,
    cadArc: paths.arc, cadAnchor: paths.anchor, cadSchedule: paths.schedule,
    classes: classification.counts, paths: paths.stats };
}
