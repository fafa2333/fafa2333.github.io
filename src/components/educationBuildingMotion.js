import { TRANSITION } from '../wireframe-transition-test/config.js';

// The chapter owns presence; the renderer owns visibility and GPU progress.
// Input reversals preserve the active shader/progress instead of resetting it.
export class EducationBuildingMotion {
  constructor() {
    this.current = this.desired = 'bit'; this.present = false;
    this.state = 'hidden'; this.plan = []; this.elapsed = 0; this.history = [];
  }
  get running() { return this.plan.length > 0; }
  get assembled() { return this.state === 'assembled' && !this.running; }
  get total() { return this.operationDuration || 0; }
  get snapshot() {
    const step = this.plan[0];
    if (!step) return { phase: this.state, mode: 0, progress: 1, model: this.assembled ? this.current : null };
    const ratio = step.duration ? Math.min(1, step.elapsed / step.duration) : 1;
    return { phase: step.mode === 0 ? 'pause' : step.mode === 1 ? 'erase' : 'draw',
      mode: step.mode, progress: step.from + (step.to - step.from) * ratio, model: step.model };
  }
  stroke(model, mode, from, to) {
    const duration = mode === 1 ? TRANSITION.DISASSEMBLE_DURATION : TRANSITION.REBUILD_DURATION;
    return { model, mode, from, to, duration: Math.abs(to - from) * duration, elapsed: 0 };
  }
  begin(steps, endState) {
    this.plan = steps.filter(step => step.duration > 1e-8);
    this.endState = endState; this.elapsed = 0;
    this.operationDuration = this.plan.reduce((sum, step) => sum + step.duration, 0);
    this.history = [];
    if (!this.plan.length) this.settle(endState); else this.enterStep();
  }
  enterStep() {
    const step = this.plan[0];
    if (step.model) this.current = step.model;
    this.history.push({ phase: this.snapshot.phase, model: step.model, elapsed: this.elapsed });
  }
  settle(state) {
    this.plan = []; this.state = state;
    if (this.present && this.state === 'hidden') this.begin([this.stroke(this.desired, 2, 0, 1)], 'assembled');
    else if (this.present && this.current !== this.desired) this.switchToDesired();
  }
  switchToDesired() {
    this.begin([this.stroke(this.current, 1, 0, 1),
      { model: null, mode: 0, from: 0, to: 0, duration: TRANSITION.PAUSE_DURATION, elapsed: 0 },
      this.stroke(this.desired, 2, 0, 1)], 'assembled');
  }
  select(model, reduced = false) {
    if (!['bit', 'hive'].includes(model)) return;
    this.desired = model;
    if (reduced) { this.current = model; this.plan = []; this.state = this.present ? 'assembled' : 'hidden'; }
    else if (this.present && this.assembled && this.current !== model) this.switchToDesired();
  }
  setPresence(present, reduced = false) {
    if (present === this.present && !(present && this.state === 'hidden' && !this.running)) return;
    this.present = present;
    if (reduced) { this.current = this.desired; this.plan = []; this.state = present ? 'assembled' : 'hidden'; return; }
    const frame = this.snapshot;
    if (!present) {
      if (!frame.model) { this.forceHidden(); return; }
      const step = frame.mode === 2 ? this.stroke(frame.model, 2, frame.progress, 0)
        : this.stroke(frame.model, 1, frame.mode === 1 ? frame.progress : 0, 1);
      this.begin([step], 'hidden');
    } else if (this.running && this.endState === 'hidden' && frame.model === this.desired) {
      const step = this.stroke(frame.model, frame.mode, frame.progress, frame.mode === 1 ? 0 : 1);
      this.begin([step], 'assembled');
    } else if (!this.running && this.state === 'hidden') {
      this.begin([this.stroke(this.desired, 2, 0, 1)], 'assembled');
    }
  }
  advance(seconds) {
    let remaining = Math.max(0, seconds);
    while (this.plan.length) {
      const step = this.plan[0], consumed = Math.min(remaining, step.duration - step.elapsed);
      step.elapsed += consumed; this.elapsed += consumed; remaining -= consumed;
      if (step.elapsed < step.duration - 1e-9) break;
      this.plan.shift();
      if (this.plan.length) this.enterStep();
      else { this.history.push({ phase: this.endState, model: this.current, elapsed: this.elapsed }); this.settle(this.endState); }
      if (remaining < 1e-9) break;
    }
  }
  forceHidden() { this.plan = []; this.state = 'hidden'; }
  finish() { this.plan = []; this.current = this.desired; this.state = this.present ? 'assembled' : 'hidden'; }
}
