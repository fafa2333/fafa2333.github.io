// Different point counts are allowed. Only one source/target is ever visible.
export class SwitchState {
  constructor(settings, current = 'bit') {
    this.settings = settings; this.current = current; this.target = null;
    this.phase = 'idle'; this.elapsed = 0; this.switches = 0;
  }
  get running() { return this.phase !== 'idle'; }
  get activeModel() {
    return this.phase === 'blank' ? null : this.phase === 'assembling' ? this.target : this.current;
  }
  get duration() {
    return this.phase === 'dissolving' ? this.settings.DISSOLVE_DURATION
      : this.phase === 'blank' ? this.settings.BLANK_DURATION : this.settings.ASSEMBLE_DURATION;
  }
  get progress() { return this.running ? Math.min(1, this.elapsed / this.duration) : 0; }
  start(reduced = false) {
    if (this.running) return false;
    this.target = this.current === 'bit' ? 'hive' : 'bit';
    this.phase = 'dissolving'; this.elapsed = 0;
    if (reduced) this.finish();
    return true;
  }
  finish() {
    if (!this.running) return;
    this.current = this.target; this.target = null;
    this.phase = 'idle'; this.elapsed = 0; this.switches++;
  }
  advance(seconds) {
    let remaining = Math.max(0, seconds);
    while (this.running && remaining > 0) {
      const used = Math.min(remaining, this.duration - this.elapsed);
      this.elapsed += used; remaining -= used;
      if (this.elapsed < this.duration - 1e-10) break;
      if (this.phase === 'assembling') { this.finish(); break; }
      this.phase = this.phase === 'dissolving' ? 'blank' : 'assembling';
      this.elapsed = 0;
    }
  }
}

// Mirrors the shader's screen-space ordering, including exact endpoints.
export function switchSample(scanX, progress, assembling, window = .22, jitter = 0) {
  const start = Math.max(0, Math.min(1 - window, scanX * (1 - window) + jitter));
  const t = Math.max(0, Math.min(1, (progress - start) / window));
  const scanned = t * t * (3 - 2 * t);
  return { displacement: assembling ? 1 - scanned : scanned,
    opacity: assembling ? scanned : 1 - scanned };
}
