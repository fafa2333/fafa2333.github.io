import { TRANSITION } from './config.js';

function hash(text) {
  let value = TRANSITION.PATH_SEED;
  for (let i = 0; i < text.length; i++) value = Math.imul(value ^ text.charCodeAt(i), 16777619);
  value ^= value >>> 16; value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15; value = Math.imul(value, 0x846ca68b);
  return (value ^ (value >>> 16)) >>> 0;
}
function random(key) { return hash(key) / 4294967296; }
function pointKey(p) { return p.map(v => Math.round(v * 10000)).join(','); }

// Link original edges into strokes once. Duplicate coincident edges share
// animation, but remain in the original geometry. No vertices are moved or
// edges merged/deleted. Smooth continuations at junctions avoid mesh-edge
// flicker; short horizontal curved edges become an arc-length-driven path.
export function buildLinePaths(lines, records, cad) {
  const count = lines.length / 26;
  const arc = new Float32Array(count * 2), anchor = new Float32Array(count * 3), schedule = new Float32Array(count * 4);
  const stats = { paths: 0, uniqueEdges: 0, multiSegmentPaths: 0, maxSegments: 0, maxLength: 0,
    forwardPaths: 0, reversePaths: 0, minDuration: Infinity, maxDuration: 0 };
  for (const object of records) {
    const nodes = new Map(), unique = new Map(), edges = [];
    for (let s = object.segment_start; s < object.segment_start + object.segment_count; s++) {
      const i = s * 26, a = Array.from(lines.subarray(i, i + 3)), b = Array.from(lines.subarray(i + 13, i + 16));
      const ka = pointKey(a), kb = pointKey(b);
      const horizontal = Math.abs(a[1] - b[1]) < 1e-4;
      const family = `${cad[s * 3]}:${horizontal ? 'h' : 'v'}:`;
      const key = family + (ka < kb ? ka + '|' + kb : kb + '|' + ka);
      const duplicate = unique.get(key);
      if (duplicate !== undefined) {
        edges[duplicate].segments.push({ index: s, reverse: ka !== edges[duplicate].ka });
        continue;
      }
      const vector = b.map((v, axis) => v - a[axis]), length = Math.hypot(...vector);
      if (length < 1e-8) throw new Error('Zero-length source line');
      const index = edges.length;
      edges.push({ a, b, ka, key, length, vector: vector.map(v => v / length),
        links: [-1, -1], segments: [{ index: s, reverse: false }] });
      unique.set(key, index);
      for (const [end, key] of [[0, ka], [1, kb]]) {
        const nodeKey = family + key;
        if (!nodes.has(nodeKey)) nodes.set(nodeKey, []);
        nodes.get(nodeKey).push({ index, end });
      }
    }
    for (const incident of nodes.values()) {
      if (incident.length < 2) continue;
      const candidates = [];
      for (let i = 0; i < incident.length; i++) for (let j = i + 1; j < incident.length; j++) {
        const a = incident[i], b = incident[j], va = edges[a.index].vector, vb = edges[b.index].vector;
        const dot = va.reduce((sum, value, axis) => sum + value * vb[axis], 0) * (a.end ? -1 : 1) * (b.end ? -1 : 1);
        // Two-edge corners are part of one stroke. At multi-edge junctions,
        // only pair smooth continuations, leaving window/floor crossings apart.
        if (dot <= (incident.length === 2 ? .35 : -TRANSITION.PATH_STRAIGHT_COSINE)) candidates.push({ a, b, dot });
      }
      candidates.sort((a, b) => a.dot - b.dot);
      for (const { a, b } of candidates) {
        if (edges[a.index].links[a.end] !== -1 || edges[b.index].links[b.end] !== -1) continue;
        edges[a.index].links[a.end] = b.index; edges[b.index].links[b.end] = a.index;
      }
    }
    const visited = new Uint8Array(edges.length);
    function walk(first, firstEnd) {
      const path = []; let index = first, end = firstEnd;
      while (index !== -1 && !visited[index]) {
        visited[index] = 1; const edge = edges[index]; path.push({ edge, end });
        const next = edge.links[1 - end];
        if (next !== -1) end = edges[next].links[0] === index ? 0 : 1;
        index = next;
      }
      const length = path.reduce((sum, item) => sum + item.edge.length, 0);
      const centroid = [0, 0, 0];
      for (const { edge } of path) for (let axis = 0; axis < 3; axis++) centroid[axis] += (edge.a[axis] + edge.b[axis]) * .5 * edge.length / length;
      const signature = object.name + ':' + path[0].edge.key;
      const seed = random(signature), direction = random(signature + ':direction') < .5 ? 0 : 1;
      const duration = TRANSITION.LINE_MIN_DURATION + random(signature + ':duration') * (TRANSITION.LINE_MAX_DURATION - TRANSITION.LINE_MIN_DURATION);
      const region = .5 + .24 * Math.sin(centroid[0] * .17 + centroid[1] * .31) + .22 * Math.sin(centroid[2] * .18 - centroid[1] * .23);
      let distance = 0;
      for (const { edge, end } of path) {
        const from = distance / length, to = (distance + edge.length) / length;
        for (const segment of edge.segments) {
          const reverse = Boolean(end) !== segment.reverse;
          arc.set(reverse ? [to, from] : [from, to], segment.index * 2);
          anchor.set(centroid, segment.index * 3);
          schedule.set([seed, region, duration, direction], segment.index * 4);
        }
        distance += edge.length;
      }
      stats.paths++; stats.multiSegmentPaths += path.length > 1 ? 1 : 0;
      stats.maxSegments = Math.max(stats.maxSegments, path.length); stats.maxLength = Math.max(stats.maxLength, length);
      stats[direction ? 'reversePaths' : 'forwardPaths']++;
      stats.minDuration = Math.min(stats.minDuration, duration); stats.maxDuration = Math.max(stats.maxDuration, duration);
    }
    // Start with open strokes, then trace closed loops from a stable seam.
    for (let i = 0; i < edges.length; i++) if (!visited[i]) {
      if (edges[i].links[0] === -1) walk(i, 0);
      else if (edges[i].links[1] === -1) walk(i, 1);
    }
    for (let i = 0; i < edges.length; i++) if (!visited[i]) walk(i, 0);
    stats.uniqueEdges += edges.length;
  }
  return { arc, anchor, schedule, stats };
}

// CPU reference for endpoint/continuity tests; rendering uses the GPU equivalent.
export function localStrokeProgress(globalProgress, arcA, arcB, reverse = false) {
  if (reverse) { arcA = 1 - arcA; arcB = 1 - arcB; }
  const minimum = Math.min(arcA, arcB), maximum = Math.max(arcA, arcB);
  return Math.max(0, Math.min(1, (globalProgress - minimum) / Math.max(maximum - minimum, 1e-8)));
}
