import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { TransitionViewer } from '../wireframe-transition-test/viewer.js';
import { TRANSITION } from '../wireframe-transition-test/config.js';
import { EducationBuildingMotion } from './educationBuildingMotion.js';
import { framingOffset } from './educationFraming.js';
import { YawMotion } from '../wireframe-dual-preview/rotation.js';
import { occlusionMaterial } from '../wireframe-dual-preview/line-material.js';
import { cadMaterial } from '../wireframe-transition-test/line-material.js';
import { educationIdle, EDUCATION_UPLOAD_BATCH } from './educationPreparationClient.js';

export class EducationArchitecture extends TransitionViewer {
  constructor(container, onDisplay, { assets, data }) {
    super(container);
    this.assets = assets; this.initialData = data;
    this.targetCoverage = .90;
    this.timeline = new EducationBuildingMotion(); this.onDisplay = onDisplay;
    this.rotation.ready = () => this.ready && this.timeline.assembled && this.timeline.present && this.visible;
  }
  load() {
    this.container.dataset.preloadState = 'preparing';
    this.preparation = this.prepare();
    return this.preparation;
  }
  async prepare() {
    // The base constructor invokes load before subclass fields are assigned.
    await Promise.resolve();
    const prepared = await this.initialData;
    if (this.disposed) return;
    this.layoutAspect = prepared.aspect; this.layoutVersion = 0;
    this.container.dataset.workerMs = prepared.workerMs.toFixed(1);
    this.container.dataset.preloadState = 'gpu';
    for (const packet of prepared.models) {
      await educationIdle(this.events.signal);
      const { key, surface, count } = packet;
      const root = new THREE.Group(), content = new THREE.Group(); root.add(content); this.scene.add(root);
      const surfaceGeometry = new THREE.BufferGeometry();
      surfaceGeometry.setAttribute('position', new THREE.BufferAttribute(surface, 3));
      const { min, max } = packet.normalization.sourceBounds;
      surfaceGeometry.boundingBox = new THREE.Box3(new THREE.Vector3(...min), new THREE.Vector3(...max));
      surfaceGeometry.boundingSphere = surfaceGeometry.boundingBox.getBoundingSphere(new THREE.Sphere());
      const occluder = new THREE.Mesh(surfaceGeometry, occlusionMaterial()); occluder.renderOrder = 0;
      const material = cadMaterial(); content.add(occluder);
      const motion = key === 'bit' ? this.rotation.motion : new YawMotion(key);
      root.rotation.set(0, motion.yaw, 0);
      this.models[key] = { root, content, positions: surface, material, motion, count,
        classes: packet.classes, paths: packet.paths, uniforms: material.userData.cadUniforms };
      this.applyLayout(this.models[key], packet);
      // Batch sizes affect uploads only. All original segments, path clocks,
      // materials and occlusion faces are preserved without resampling.
      for (let start = 0; start < count; start += EDUCATION_UPLOAD_BATCH) {
        await educationIdle(this.events.signal);
        const end = Math.min(count, start + EDUCATION_UPLOAD_BATCH);
        const geometry = new LineSegmentsGeometry(); geometry.setPositions(packet.endpoints.subarray(start * 6, end * 6));
        for (const [name, size] of [['faceA', 3], ['faceB', 3], ['structural', 1], ['cadData', 3],
          ['cadArc', 2], ['cadAnchor', 3], ['cadSchedule', 4]]) {
          geometry.setAttribute(name, new THREE.InstancedBufferAttribute(packet[name].subarray(start * size, end * size), size));
        }
        const drawing = new LineSegments2(geometry, material); drawing.renderOrder = 1; content.add(drawing);
      }
    }
    this.resize();
    if (this.layoutPending) await this.layoutPending;
    await educationIdle(this.events.signal);
    await this.renderer.compileAsync(this.scene, this.camera);
    if (this.disposed) return;
    // Tiny private render target prevents partial warm-up strokes flashing in
    // the visible chapter if the user navigates here unusually quickly.
    const target = new THREE.WebGLRenderTarget(1, 1);
    for (const model of Object.values(this.models)) {
      model.root.visible = false;
      for (const child of model.content.children) child.visible = false;
    }
    try {
      for (const model of Object.values(this.models)) {
        for (const child of model.content.children) {
          await educationIdle(this.events.signal);
          model.root.visible = true; child.visible = true;
          this.renderer.setRenderTarget(target); this.renderer.render(this.scene, this.camera);
          this.renderer.setRenderTarget(null);
          child.visible = false; model.root.visible = false;
        }
      }
    } finally {
      if (!this.disposed) this.renderer.setRenderTarget(null);
      target.dispose();
    }
    for (const model of Object.values(this.models)) for (const child of model.content.children) child.visible = true;
    this.ready = true; this.status.hidden = true;
    this.loadMs = performance.now() - this.loadStarted;
    if (this.timeline.running) this.freeze();
    this.container.dataset.preloadState = 'ready';
    this.container.dataset.ready = 'true'; this.paintState(); this.wake();
  }
  resize() {
    if (this.disposed) return;
    const { width, height } = this.viewport.getBoundingClientRect();
    if (!width || !height) return;
    this.renderer.setSize(width, height, false); this.camera.aspect = width / height; this.camera.updateProjectionMatrix();
    for (const model of Object.values(this.models)) model.material.resolution.set(width, height);
    const aspect = width / height;
    if (this.assets && this.models.bit && this.models.hive && Math.abs(this.layoutAspect - aspect) > 1e-6) {
      this.layoutAspect = aspect;
      const version = ++this.layoutVersion;
      this.layoutPending = this.assets.request('layout', aspect).then(layouts => {
        if (this.disposed || version !== this.layoutVersion) return;
        for (const [key, layout] of Object.entries(layouts)) {
          this.applyLayout(this.models[key], layout);
          if (this.timeline.running) this.captureBounds(this.models[key]);
        }
        this.wake();
      }).catch(error => { if (!this.disposed) console.error(error); });
    }
    this.wake();
  }
  applyLayout(model, { normalization, framing }) {
    model.normalization = normalization; model.framing = framing;
    model.uniforms.uHeightBounds.value.set(normalization.sourceBounds.min[1], normalization.sourceBounds.max[1]);
    model.content.scale.setScalar(framing.scale);
    model.content.position.set(...normalization.center.map(v => -v * framing.scale));
    this.centerModel(model);
  }
  centerModel(model) {
    if (model.framing) model.root.position.fromArray(framingOffset(model.framing, model.root.rotation.y));
  }
  freeze() {
    this.rotation.stop(); this.lastTime = null; this.frozenPoses = {};
    if (!this.ready) return;
    for (const [key, model] of Object.entries(this.models)) {
      model.root.rotation.set(0, model.motion.yaw, 0);
      this.centerModel(model);
      this.frozenPoses[key] = { yaw: model.motion.yaw, pivot: model.root.position.toArray() };
      this.captureBounds(model);
    }
  }
  select(model) {
    const wasRunning = this.timeline.running;
    this.timeline.select(model, this.reduced.matches);
    if (!wasRunning && this.timeline.running) this.freeze();
    this.wake();
  }
  setPresence(present) {
    const wasRunning = this.timeline.running;
    this.timeline.setPresence(present, this.reduced.matches);
    if (this.timeline.running && !wasRunning) this.freeze();
    if (!this.visible && !present) this.timeline.forceHidden();
    this.wake();
  }
  paintState() {
    const frame = this.timeline.snapshot;
    // Use the renderer's clock so the caption shares the erase / blank / draw
    // phases, including scroll reversals and reduced-motion instant switches.
    const clip = frame.mode === 1 ? `inset(0 0 0 ${frame.progress * 100}%)`
      : frame.mode === 2 ? `inset(0 ${(1 - frame.progress) * 100}% 0 0)`
        : frame.model ? 'inset(0 0 0 0)' : 'inset(0 0 0 100%)';
    if (clip !== this.captionClip) {
      this.captionClip = clip;
      this.container.querySelector('.education-building-caption').style.clipPath = clip;
    }
    this.current = this.timeline.current;
    for (const [key, model] of Object.entries(this.models)) {
      model.root.visible = frame.model === key;
      model.uniforms.uCadMode.value = frame.mode; model.uniforms.uCadProgress.value = frame.progress;
      model.uniforms.uStageDuration.value = frame.mode === 1 ? TRANSITION.DISASSEMBLE_DURATION : TRANSITION.REBUILD_DURATION;
    }
    if (frame.model && this.displayed !== frame.model) {
      this.displayed = frame.model; this.onDisplay?.(frame.model);
    }
    this.rotation.motion = this.models[this.current].motion;
    this.canvas.dataset.transition = String(this.timeline.running);
  }
  complete() { this.timeline.finish(); this.paintState(); this.rotation.stop(); this.lastTime = null; }
  wake() {
    if (this.ready && this.visible && this.timeline.present && !this.timeline.running && this.timeline.state === 'hidden') {
      this.timeline.setPresence(true, this.reduced.matches); this.freeze();
    }
    super.wake();
  }
  render(time) {
    this.frame = 0;
    if (!this.ready || this.disposed || !this.visible || document.hidden || this.contextLost) return;
    const dt = this.lastTime == null ? 0 : Math.max(0, (time - this.lastTime) / 1000); this.lastTime = time;
    const wasRunning = this.timeline.running;
    this.timeline.advance(dt); this.paintState();
    if (wasRunning && !this.timeline.running) this.rotation.stop();
    if (this.timeline.assembled && this.timeline.present) {
      this.rotation.update(wasRunning ? 0 : dt, this.models[this.current].root);
    }
    const start = performance.now(); this.renderer.render(this.scene, this.camera);
    this.cpuMs = performance.now() - start; this.frames++;
    this.container.dataset.view = JSON.stringify({ ...this.diagnostics, history: this.timeline.history, present: this.timeline.present, desired: this.timeline.desired });
    if (this.timeline.running || this.rotation.moving) this.wake(); else this.lastTime = null;
  }
  pause() {
    super.pause();
    if (this.timeline instanceof EducationBuildingMotion && !this.visible) {
      this.timeline.forceHidden();
      if (this.ready && !this.disposed) {
        this.paintState();
        this.container.dataset.view = JSON.stringify({ ...this.diagnostics, history: this.timeline.history, present: this.timeline.present, desired: this.timeline.desired });
      }
    }
  }
  dispose() { super.dispose(); this.assets?.dispose(); }
}
