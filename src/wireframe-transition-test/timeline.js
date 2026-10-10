import { TRANSITION } from './config.js';

export class TransitionTimeline {
  constructor(config = TRANSITION) { this.config = config; this.elapsed = 0; this.running = false; }
  get total() {
    const c = this.config;
    return c.DISASSEMBLE_DURATION + c.PAUSE_DURATION + c.REBUILD_DURATION;
  }
  start() { if (this.running) return false; this.elapsed = 0; this.running = true; return true; }
  advance(seconds) {
    if (!this.running) return;
    this.elapsed = Math.min(this.total, this.elapsed + Math.max(0, seconds));
    if (this.elapsed >= this.total - 1e-9) { this.elapsed = this.total; this.running = false; }
  }
  finish() { this.elapsed = this.total; this.running = false; }
  get snapshot() {
    if (!this.running) return { phase: 'idle', progress: 1, visible: 'current' };
    const c = this.config, time = this.elapsed;
    const pauseStart = c.DISASSEMBLE_DURATION, drawStart = pauseStart + c.PAUSE_DURATION;
    if (time + 1e-9 < pauseStart) return { phase: 'erase', progress: time / pauseStart, visible: 'old' };
    if (time + 1e-9 < drawStart) return { phase: 'pause', progress: Math.max(0, (time - pauseStart) / c.PAUSE_DURATION), visible: null };
    return { phase: 'draw', progress: Math.max(0, (time - drawStart) / c.REBUILD_DURATION), visible: 'new' };
  }
}
