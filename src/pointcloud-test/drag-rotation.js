import * as THREE from 'three';
import { CONFIG } from './config.js';
import { clampPitch } from './core.js';

// Same speed, pitch clamp, release policy and exponential inertia as the
// existing preview. Rotation state belongs to the viewer, not a model.
export class DragRotation {
  constructor(canvas, { ready, reduced, wake }) {
    this.canvas = canvas; this.reduced = reduced; this.wake = wake;
    this.yaw = 0; this.pitch = 0; this.velocityX = 0; this.velocityY = 0; this.pointer = null;
    this.yawQuat = new THREE.Quaternion(); this.pitchQuat = new THREE.Quaternion();
    this.yAxis = new THREE.Vector3(0, 1, 0);
    const direction = new THREE.Vector3(...CONFIG.CAMERA_DIRECTION).normalize();
    this.right = new THREE.Vector3().crossVectors(this.yAxis, direction).normalize();
    this.events = new AbortController(); const options = { signal: this.events.signal };
    canvas.addEventListener('pointerdown', e => {
      if (!ready() || e.button !== 0 || !e.isPrimary) return;
      this.velocityX = this.velocityY = 0;
      this.pointer = { id: e.pointerId, x: e.clientX, y: e.clientY, time: e.timeStamp };
      canvas.setPointerCapture(e.pointerId); canvas.dataset.dragging = 'true'; e.preventDefault();
    }, options);
    canvas.addEventListener('pointermove', e => {
      const p = this.pointer; if (!p || p.id !== e.pointerId) return;
      const dt = Math.max(.008, (e.timeStamp - p.time) / 1000);
      const dx = (e.clientX - p.x) * CONFIG.ROTATION_SPEED, dy = (e.clientY - p.y) * CONFIG.ROTATION_SPEED;
      this.yaw += dx; const previous = this.pitch;
      this.pitch = clampPitch(this.pitch + dy, CONFIG.MAX_VERTICAL_ROTATION);
      this.velocityX = THREE.MathUtils.clamp(dx / dt, -1.4, 1.4);
      this.velocityY = THREE.MathUtils.clamp((this.pitch - previous) / dt, -1.4, 1.4);
      Object.assign(p, { x: e.clientX, y: e.clientY, time: e.timeStamp }); wake();
    }, options);
    const release = e => {
      if (!this.pointer || this.pointer.id !== e.pointerId) return;
      if (e.type === 'pointercancel' || e.timeStamp - this.pointer.time > 80 || reduced.matches) this.velocityX = this.velocityY = 0;
      this.pointer = null; canvas.dataset.dragging = 'false';
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
      wake();
    };
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(name, release, options);
    canvas.addEventListener('keydown', e => {
      const keys = { ArrowLeft: [-.08, 0], ArrowRight: [.08, 0], ArrowUp: [0, -.06], ArrowDown: [0, .06] };
      if (!ready() || !keys[e.key]) return;
      e.preventDefault(); this.velocityX = this.velocityY = 0; this.yaw += keys[e.key][0];
      this.pitch = clampPitch(this.pitch + keys[e.key][1], CONFIG.MAX_VERTICAL_ROTATION); wake();
    }, options);
  }
  get moving() { return Boolean(this.velocityX || this.velocityY); }
  update(dt, group) {
    if (!this.pointer && !this.reduced.matches) {
      this.yaw += this.velocityX * dt;
      const next = clampPitch(this.pitch + this.velocityY * dt, CONFIG.MAX_VERTICAL_ROTATION);
      if (next === this.pitch) this.velocityY = 0;
      this.pitch = next;
      const decay = Math.exp(-dt / CONFIG.ROTATION_INERTIA);
      this.velocityX *= decay; this.velocityY *= decay;
      if (Math.abs(this.velocityX) + Math.abs(this.velocityY) < .004) this.velocityX = this.velocityY = 0;
    }
    this.yawQuat.setFromAxisAngle(this.yAxis, this.yaw); this.pitchQuat.setFromAxisAngle(this.right, this.pitch);
    group.quaternion.copy(this.pitchQuat).multiply(this.yawQuat);
  }
  stop() {
    this.velocityX = this.velocityY = 0;
    if (this.pointer && this.canvas.hasPointerCapture(this.pointer.id)) this.canvas.releasePointerCapture(this.pointer.id);
    this.pointer = null; this.canvas.dataset.dragging = 'false';
  }
  dispose() { this.stop(); this.events.abort(); }
}
