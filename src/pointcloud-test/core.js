export function parseBinary(buffer, magic, stride) {
  if (buffer.byteLength < 16) throw new Error('点云文件头不完整');
  const header = new DataView(buffer);
  const count = header.getUint32(8, true);
  if (header.getUint32(0, true) !== magic || header.getUint32(4, true) !== 1 ||
      header.getUint32(12, true) !== stride || !count ||
      buffer.byteLength !== 16 + count * stride * 4) throw new Error('点云数据格式不匹配');
  const data = new Float32Array(buffer, 16);
  for (const value of data) if (!Number.isFinite(value)) throw new Error('点云坐标无效');
  return { count, stride, data };
}

export function random(seed) {
  let x = (seed + 0x9e3779b9) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x21f0aaad);
  x = Math.imul(x ^ (x >>> 15), 0x735a2d97);
  return ((x ^ (x >>> 15)) >>> 0) / 4294967296;
}

export function scatterPosition(p, seed, distance) {
  const length = Math.hypot(...p) || 1;
  const radial = distance * (.30 + random(seed) * .35);
  return p.map((v, axis) => v + v / length * radial +
    (random(seed + axis * 101 + 7) * 2 - 1) * distance * .45);
}

// Shared scheduling formula is also present in the GLSL source. Exact endpoints
// guarantee that aggregation restores the original coordinates, including V5 noise.
export function scanAmount(scan, progress, mode, window = .22, jitter = 0) {
  const ordered = mode === 1 ? scan : 1 - scan;
  const start = Math.max(0, Math.min(1 - window, ordered * (1 - window) + jitter));
  const t = Math.max(0, Math.min(1, (progress - start) / window));
  const ease = t * t * (3 - 2 * t);
  return mode === 1 ? ease : 1 - ease;
}

export class ScanState {
  constructor(duration, aggregateDuration = duration) { this.duration = duration; this.aggregateDuration = aggregateDuration; this.state = 'assembled'; this.mode = 1; this.progress = 0; }
  get running() { return this.state === 'scattering' || this.state === 'assembling'; }
  get label() { return this.state === 'assembled' || this.state === 'scattering' ? '散开' : '聚合'; }
  start(reduced = false) {
    if (this.running) return false;
    this.mode = this.state === 'assembled' ? 1 : -1;
    this.state = this.mode === 1 ? 'scattering' : 'assembling'; this.progress = 0;
    if (reduced) this.advance(this.mode === 1 ? this.duration : this.aggregateDuration);
    return true;
  }
  advance(seconds) {
    if (!this.running) return;
    this.progress = Math.min(1, this.progress + seconds / (this.mode === 1 ? this.duration : this.aggregateDuration));
    if (this.progress >= 1) this.state = this.mode === 1 ? 'scattered' : 'assembled';
  }
}

export function clampPitch(value, limits) {
  return Math.max(limits[0] * Math.PI / 180, Math.min(limits[1] * Math.PI / 180, value));
}
