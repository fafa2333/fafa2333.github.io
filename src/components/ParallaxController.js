const clamp = value => Math.max(-1, Math.min(1, value));
const deltaAngle = (value, neutral) => ((value - neutral + 540) % 360) - 180;
const deadZone = value => Math.abs(value) < .4 ? 0 : value - Math.sign(value) * .4;

// Mouse and calibrated orientation feed one time-based, demand-rendered filter.
// This class owns inputs only; the renderer owns camera/focus and all animation.
export class ParallaxController {
  constructor({ surface, wake, onMotion, environment = window }) {
    this.env = environment; this.surface = surface; this.wake = wake; this.onMotion = onMotion;
    this.target = { x: 0, y: 0 }; this.current = { x: 0, y: 0 };
    this.filtered = { x: 0, y: 0 }; this.neutral = null;
    this.gain = 1; this.focused = false;
    this.visible = false; this.reduced = false; this.enabled = false; this.disposed = false;
    this.sensorAttached = false; this.lastTime = 0;
    this.coarse = environment.matchMedia('(pointer: coarse)');
    this.move = event => {
      if (!this.active || this.coarse.matches || event.pointerType !== 'mouse') return;
      this.setInput(event.clientX / this.env.innerWidth * 2 - 1, 1 - event.clientY / this.env.innerHeight * 2);
    };
    this.leave = () => { if (!this.enabled) this.setInput(0, 0); };
    this.orientation = event => this.readOrientation(event);
    this.recalibrate = () => { this.neutral = null; this.filtered.x = this.filtered.y = 0; this.setInput(0, 0); };
    surface.addEventListener('pointermove', this.move, { passive: true });
    surface.addEventListener('pointerleave', this.leave, { passive: true });
    environment.addEventListener('blur', this.leave);
    this.direction = environment.screen?.orientation;
    this.direction?.addEventListener?.('change', this.recalibrate);
    environment.addEventListener('orientationchange', this.recalibrate);
  }
  get active() { return this.visible && !this.reduced && !this.env.document.hidden && !this.disposed; }
  setInput(x, y) {
    this.target.x = clamp(x); this.target.y = clamp(y);
    if (this.active) this.wake();
  }
  setActivity(visible, reduced) {
    this.visible = visible; this.reduced = reduced; this.lastTime = 0;
    if (!this.active) {
      this.target.x = this.target.y = this.current.x = this.current.y = 0;
      this.gain = this.focused ? .2 : 1;
      this.detachSensor();
    } else if (this.enabled) this.attachSensor();
  }
  setFocus(focused) { this.focused = focused; if (this.active) this.wake(); }
  async toggleMotion() {
    if (this.disposed) return;
    if (this.enabled) {
      this.enabled = false; this.detachSensor(); this.setInput(0, 0); this.onMotion('idle'); return;
    }
    const API = this.env.DeviceOrientationEvent;
    if (this.reduced) { this.onMotion('reduced'); return; }
    if (!API || !this.env.isSecureContext) { this.onMotion('unavailable'); return; }
    this.onMotion('requesting');
    try {
      // Called synchronously from the button gesture, before any other await.
      const permission = typeof API.requestPermission === 'function' ? await API.requestPermission() : 'granted';
      if (this.disposed) return;
      if (permission !== 'granted') { this.onMotion('denied'); return; }
      this.enabled = true; this.onMotion('enabled');
      if (this.active) this.attachSensor();
    } catch { if (!this.disposed) this.onMotion('denied'); }
  }
  attachSensor() {
    if (this.sensorAttached) return;
    this.sensorAttached = true; this.recalibrate();
    this.env.addEventListener('deviceorientation', this.orientation, { passive: true });
    this.sensorTimeout = this.env.setTimeout(() => {
      if (this.neutral || !this.active) return;
      this.enabled = false; this.detachSensor(); this.onMotion('unavailable');
    }, 2500);
  }
  detachSensor() {
    this.env.clearTimeout(this.sensorTimeout);
    this.env.removeEventListener('deviceorientation', this.orientation);
    this.sensorAttached = false; this.neutral = null;
  }
  readOrientation({ beta, gamma }) {
    if (!this.active || !this.enabled || !Number.isFinite(beta) || !Number.isFinite(gamma)) return;
    if (!this.neutral) {
      this.neutral = { beta, gamma }; this.env.clearTimeout(this.sensorTimeout); return;
    }
    const x = clamp(deadZone(deltaAngle(gamma, this.neutral.gamma)) / 12);
    const y = clamp(-deadZone(deltaAngle(beta, this.neutral.beta)) / 10);
    const angle = (this.direction?.angle ?? this.env.orientation ?? 0) * Math.PI / 180;
    const nx = x * Math.cos(angle) - y * Math.sin(angle), ny = x * Math.sin(angle) + y * Math.cos(angle);
    this.filtered.x += (clamp(nx) - this.filtered.x) * .18;
    this.filtered.y += (clamp(ny) - this.filtered.y) * .18;
    this.setInput(this.filtered.x, this.filtered.y);
  }
  step(now) {
    const dt = this.lastTime ? Math.min((now - this.lastTime) / 1000, .05) : 1 / 60;
    this.lastTime = now;
    const alpha = 1 - Math.pow(1 - .055, dt * 60);
    let moving = false;
    const gainTarget = this.focused ? .2 : 1;
    this.gain += (gainTarget - this.gain) * alpha;
    if (Math.abs(gainTarget - this.gain) < .0002) this.gain = gainTarget;
    else moving = true;
    for (const axis of ['x', 'y']) {
      const target = this.active ? this.target[axis] : 0;
      this.current[axis] += (target - this.current[axis]) * alpha;
      if (Math.abs(target - this.current[axis]) < .0002) this.current[axis] = target;
      else moving = true;
    }
    if (!moving) this.lastTime = 0;
    return moving;
  }
  dispose() {
    this.disposed = true; this.detachSensor();
    this.surface.removeEventListener('pointermove', this.move);
    this.surface.removeEventListener('pointerleave', this.leave);
    this.env.removeEventListener('blur', this.leave);
    this.direction?.removeEventListener?.('change', this.recalibrate);
    this.env.removeEventListener('orientationchange', this.recalibrate);
  }
}
