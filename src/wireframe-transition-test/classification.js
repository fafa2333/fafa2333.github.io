export const LINE_CLASS = Object.freeze({ outline: 0, primary: 1, detail: 2 });

// All classifications are derived once from the existing edge stream and
// object ranges. No source geometry/metadata is rewritten.
export function classifyLines(model, lines, records) {
  const count = lines.length / 26, cad = new Float32Array(count * 3);
  let minimum = Infinity, maximum = -Infinity;
  for (let i = 0; i < lines.length; i += 13) {
    minimum = Math.min(minimum, lines[i + 1]); maximum = Math.max(maximum, lines[i + 1]);
  }
  const counts = { outline: 0, primary: 0, detail: 0 };
  for (const object of records) {
    let bottom = Infinity, top = -Infinity;
    for (let s = object.segment_start; s < object.segment_start + object.segment_count; s++) {
      const i = s * 26;
      bottom = Math.min(bottom, lines[i + 1], lines[i + 14]);
      top = Math.max(top, lines[i + 1], lines[i + 14]);
    }
    for (let s = object.segment_start; s < object.segment_start + object.segment_count; s++) {
      const i = s * 26, y = (lines[i + 1] + lines[i + 14]) * .5;
      const horizontal = Math.abs(lines[i + 1] - lines[i + 14]) < 1e-4;
      const silhouette = lines[i + 12] < .5;
      let kind;
      if (model === 'bit') {
        const facadeDetail = /WindowModules|ContinuousFloorHeaders|GroundPad/.test(object.name);
        kind = facadeDetail ? 2 : silhouette ? 0 : 1;
      } else if (object.role === 'rounded_tower') {
        // Curved silhouettes + roof/base rings establish tower volumes first;
        // intermediate ribs/floor seams build upwards in the detail stage.
        kind = silhouette ? 0 : horizontal && y > bottom + .8 && y < top - .8 ? 2 : 1;
      } else if (/rib|support|column|gallery|bridge/i.test(object.role + ' ' + object.name)) {
        kind = 2;
      } else if (/core/.test(object.role) && horizontal && y > bottom + .8 && y < top - .8) {
        kind = 2;
      } else {
        kind = silhouette ? 0 : 1;
      }
      cad[s * 3] = kind;
      cad[s * 3 + 1] = (y - minimum) / Math.max(maximum - minimum, 1e-6);
      cad[s * 3 + 2] = ((Math.imul(s + 1, 2654435761) >>> 0) % 65536) / 65535;
      counts[['outline', 'primary', 'detail'][kind]]++;
    }
  }
  return { cad, counts };
}
