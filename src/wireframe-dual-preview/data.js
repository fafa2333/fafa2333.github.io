export function decodeGeometry(buffer, magic, stride) {
  if (buffer.byteLength < 16) throw new Error('Incomplete architectural geometry');
  const header = new DataView(buffer);
  const count = header.getUint32(8, true);
  if (header.getUint32(0, true) !== magic || header.getUint32(4, true) !== 1 ||
      header.getUint32(12, true) !== stride || buffer.byteLength !== 16 + count * stride * 4) {
    throw new Error('Invalid architectural geometry format');
  }
  return new Float32Array(buffer, 16, count * stride);
}

export async function loadArchitecture(model, signal) {
  const read = async (suffix, magic, stride) => {
    const response = await fetch(`/models/architectural-lines/${model}-${suffix}.bin`, { signal });
    if (!response.ok) throw new Error(`Unable to load ${model} ${suffix}`);
    return decodeGeometry(await response.arrayBuffer(), magic, stride);
  };
  const [surface, lines] = await Promise.all([
    read('surface', 0x57465346, 3), read('lines', 0x57464C4E, 13),
  ]);
  return { surface, lines };
}
