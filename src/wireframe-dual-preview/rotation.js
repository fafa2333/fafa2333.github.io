import { ROTATION } from './config.js';

// Analytic velocity integration gives the same yaw at 30/60/144 Hz. Release
// momentum blends rapidly into auto speed; no reset or opposing controllers.
export class YawMotion {
  constructor(model) {
    this.yaw = ROTATION.initialDegrees[model] * Math.PI / 180;
    this.autoSpeed = ROTATION.autoDegreesPerSecond * Math.PI / 180;
    this.velocity = this.autoSpeed; this.dragging = false;
  }
  begin() { this.dragging = true; this.velocity = 0; }
  drag(pixels, seconds) {
    const delta = pixels * ROTATION.radiansPerPixel;
    this.yaw += delta;
    this.velocity = Math.max(-ROTATION.maxReleaseRadiansPerSecond,
      Math.min(ROTATION.maxReleaseRadiansPerSecond, delta / Math.max(.008, seconds)));
  }
  release(momentum = true) { this.dragging = false; if (!momentum) this.velocity = 0; }
  update(seconds, reduced = false) {
    if (this.dragging) return;
    if (reduced) { this.velocity = 0; return; }
    const dt = Math.max(0, seconds), tau = ROTATION.resumeTimeConstant;
    const difference = this.velocity - this.autoSpeed;
    const decay = Math.exp(-dt / tau);
    this.yaw += this.autoSpeed * dt + difference * tau * (1 - decay);
    this.velocity = this.autoSpeed + difference * decay;
  }
}

export class HorizontalRotation {
  constructor(canvas, { model, ready, reduced, wake }) {
    this.canvas = canvas; this.ready = ready; this.reduced = reduced; this.wake = wake;
    this.motion = new YawMotion(model); this.pointer = null;
    this.events = new AbortController(); const options = { signal: this.events.signal };
    canvas.addEventListener('pointerdown', e => {
      if (!ready() || e.button !== 0 || !e.isPrimary || this.pointer) return;
      this.motion.begin();
      this.pointer = { id: e.pointerId, startX: e.clientX, startY: e.clientY,
        x: e.clientX, time: e.timeStamp, pending: e.pointerType === 'touch' };
      if (!this.pointer.pending) { canvas.setPointerCapture(e.pointerId); e.preventDefault(); }
      canvas.dataset.dragging = 'true'; wake();
    }, options);
    canvas.addEventListener('pointermove', e => {
      const p = this.pointer; if (!p || p.id !== e.pointerId) return;
      if (p.pending) {
        const dx = Math.abs(e.clientX - p.startX), dy = Math.abs(e.clientY - p.startY);
        if (dy > ROTATION.touchThresholdPixels && dy > dx) { this.stop(); wake(); return; }
        if (dx < ROTATION.touchThresholdPixels || dx <= dy) return;
        p.pending = false; canvas.setPointerCapture(e.pointerId);
      }
      this.motion.drag(e.clientX - p.x, (e.timeStamp - p.time) / 1000);
      p.x = e.clientX; p.time = e.timeStamp;
      e.preventDefault(); wake();
    }, options);
    const release = e => {
      const p = this.pointer; if (!p || p.id !== e.pointerId) return;
      this.motion.release(!p.pending && e.type === 'pointerup' &&
        e.timeStamp - p.time <= ROTATION.staleReleaseMs && !reduced.matches);
      this.pointer = null; canvas.dataset.dragging = 'false';
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
      wake();
    };
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(type, release, options);
    canvas.addEventListener('keydown', e => {
      if (!ready() || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      e.preventDefault(); this.motion.begin(); this.motion.drag(e.key === 'ArrowRight' ? 15 : -15, .1);
      this.motion.release(false); wake();
    }, options);
  }
  get yaw() { return this.motion.yaw; }
  get pitch() { return 0; }
  get moving() { return this.ready() && !this.motion.dragging && !this.reduced.matches; }
  update(dt, group) {
    if (this.ready()) this.motion.update(dt, this.reduced.matches);
    // Y is the actual vertical axis of all exported Hive and BIT geometry.
    group.rotation.set(0, this.motion.yaw, 0);
  }
  stop() {
    const p = this.pointer; this.pointer = null; this.motion.release(false);
    this.canvas.dataset.dragging = 'false';
    if (p && this.canvas.hasPointerCapture(p.id)) this.canvas.releasePointerCapture(p.id);
  }
  dispose() { this.stop(); this.events.abort(); }
}
