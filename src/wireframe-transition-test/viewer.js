import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LINE_STYLE } from '../wireframe-dual-preview/config.js';
import { HorizontalRotation, YawMotion } from '../wireframe-dual-preview/rotation.js';
import { loadArchitecture } from '../wireframe-dual-preview/data.js';
import { occlusionMaterial } from '../wireframe-dual-preview/line-material.js';
import { calculateNormalization } from '../pointcloud-test/normalization.js';
import { classifyLines } from './classification.js';
import { cadMaterial } from './line-material.js';
import { TransitionTimeline } from './timeline.js';
import { buildLinePaths } from './paths.js';
import { TRANSITION } from './config.js';

export class TransitionViewer {
  constructor(container) {
    this.container = container; this.viewport = container.querySelector('.transition-viewport');
    this.canvas = container.querySelector('canvas'); this.button = container.querySelector('button');
    this.status = container.querySelector('.load-status');
    this.events = new AbortController(); this.reduced = matchMedia('(prefers-reduced-motion: reduce)');
    this.loadStarted = performance.now();
    this.timeline = new TransitionTimeline(); this.models = {}; this.current = 'bit';
    this.ready = false; this.visible = true; this.frames = 0; this.phaseHistory = [];
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, LINE_STYLE.maxDPR));
    this.renderer.setClearColor(0, 0);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(LINE_STYLE.fov, 1, .1, 500);
    this.camera.position.fromArray(LINE_STYLE.cameraDirection).normalize().multiplyScalar(LINE_STYLE.cameraDistance);
    this.camera.lookAt(0, 0, 0);
    this.rotation = new HorizontalRotation(this.canvas, { model: 'bit',
      ready: () => this.ready && !this.timeline.running, reduced: this.reduced, wake: () => this.wake() });
    const options = { signal: this.events.signal };
    this.button?.addEventListener('click', () => this.switchBuilding(), options);
    this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(this.viewport);
    this.intersection = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting; this.visible ? this.wake() : this.pause();
    }); this.intersection.observe(this.viewport);
    document.addEventListener('visibilitychange', () => document.hidden ? this.pause() : this.wake(), options);
    this.reduced.addEventListener('change', () => {
      this.rotation.stop();
      if (this.reduced.matches && this.timeline.running) { this.timeline.finish(); this.complete(); }
      this.wake();
    }, options);
    this.canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); this.contextLost = true; this.pause(); }, options);
    this.canvas.addEventListener('webglcontextrestored', () => { this.contextLost = false; this.wake(); }, options);
    this.load();
  }
  async load() {
    try {
      const manifestResponse = await fetch('/models/architectural-lines/manifest.json', { signal: this.events.signal });
      if (!manifestResponse.ok) throw new Error('Architectural manifest unavailable');
      const manifest = await manifestResponse.json();
      const data = await Promise.all(['bit', 'hive'].map(async key => ({ key, ...await loadArchitecture(key, this.events.signal) })));
      if (this.disposed) return;
      for (const { key, surface, lines } of data) {
        const root = new THREE.Group(), content = new THREE.Group(); root.add(content); this.scene.add(root);
        const surfaceGeometry = new THREE.BufferGeometry();
        surfaceGeometry.setAttribute('position', new THREE.BufferAttribute(surface, 3));
        const occluder = new THREE.Mesh(surfaceGeometry, occlusionMaterial()); occluder.renderOrder = 0;
        const count = lines.length / 26;
        const endpoints = new Float32Array(count * 6), a = new Float32Array(count * 3), b = new Float32Array(count * 3), kind = new Float32Array(count);
        for (let s = 0; s < count; s++) {
          const i = s * 26;
          endpoints.set(lines.subarray(i, i + 3), s * 6); endpoints.set(lines.subarray(i + 13, i + 16), s * 6 + 3);
          a.set(lines.subarray(i + 6, i + 9), s * 3); b.set(lines.subarray(i + 9, i + 12), s * 3); kind[s] = lines[i + 12];
        }
        const geometry = new LineSegmentsGeometry(); geometry.setPositions(endpoints);
        geometry.setAttribute('faceA', new THREE.InstancedBufferAttribute(a, 3));
        geometry.setAttribute('faceB', new THREE.InstancedBufferAttribute(b, 3));
        geometry.setAttribute('structural', new THREE.InstancedBufferAttribute(kind, 1));
        const classification = classifyLines(key, lines, manifest[key].objects);
        geometry.setAttribute('cadData', new THREE.InstancedBufferAttribute(classification.cad, 3));
        const paths = buildLinePaths(lines, manifest[key].objects, classification.cad);
        geometry.setAttribute('cadArc', new THREE.InstancedBufferAttribute(paths.arc, 2));
        geometry.setAttribute('cadAnchor', new THREE.InstancedBufferAttribute(paths.anchor, 3));
        geometry.setAttribute('cadSchedule', new THREE.InstancedBufferAttribute(paths.schedule, 4));
        const material = cadMaterial(), drawing = new LineSegments2(geometry, material); drawing.renderOrder = 1;
        content.add(occluder, drawing);
        const motion = key === 'bit' ? this.rotation.motion : new YawMotion(key);
        root.rotation.set(0, motion.yaw, 0);
        this.models[key] = { root, content, positions: surface, material, motion, count, classes: classification.counts, paths: paths.stats,
          uniforms: material.userData.cadUniforms };
      }
      this.resize();
      // Compile both states up front so first use of Hive cannot stall a scan.
      await this.renderer.compileAsync(this.scene, this.camera);
      if (this.disposed) return;
      this.models.hive.root.visible = false;
      this.ready = true; this.status.hidden = true; if (this.button) this.button.disabled = false;
      this.loadMs = performance.now() - this.loadStarted;
      this.wake();
    } catch (error) {
      if (this.disposed) return;
      this.status.hidden = false; this.status.textContent = '线稿加载失败，请刷新重试。'; console.error(error);
    }
  }
  resize() {
    if (this.disposed) return;
    const { width, height } = this.viewport.getBoundingClientRect(); if (!width || !height) return;
    this.renderer.setSize(width, height, false); this.camera.aspect = width / height; this.camera.updateProjectionMatrix();
    for (const model of Object.values(this.models)) {
      model.material.resolution.set(width, height);
      const key = model === this.models.bit ? 'bit' : 'hive';
      const normalization = calculateNormalization(model.positions, { aspect: width / height,
        direction: LINE_STYLE.cameraDirection, distance: LINE_STYLE.cameraDistance, fov: LINE_STYLE.fov,
        targetCoverage: this.targetCoverage ?? LINE_STYLE.targetCoverage, ...LINE_STYLE.models[key] });
      model.normalization = normalization;
      model.uniforms.uHeightBounds.value.set(normalization.sourceBounds.min[1], normalization.sourceBounds.max[1]);
      model.content.scale.setScalar(normalization.scale);
      model.content.position.set(...normalization.center.map(v => -v * normalization.scale));
      model.root.position.fromArray(normalization.offset);
      if (this.timeline.running) this.captureBounds(model);
    }
    this.wake();
  }
  captureBounds(model) {
    model.root.updateMatrixWorld(true); this.camera.updateMatrixWorld();
    const matrix = new THREE.Matrix4().multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse)
      .multiply(model.content.matrixWorld);
    let minimum = Infinity, maximum = -Infinity;
    const point = new THREE.Vector3(), positions = model.positions;
    for (let i = 0; i < positions.length; i += 3) {
      point.fromArray(positions, i).applyMatrix4(matrix); minimum = Math.min(minimum, point.x); maximum = Math.max(maximum, point.x);
    }
    model.uniforms.uScanBounds.value.set(minimum, maximum);
  }
  switchBuilding() {
    if (!this.ready || !this.timeline.start()) return;
    this.rotation.stop(); this.old = this.current; this.incoming = this.current === 'bit' ? 'hive' : 'bit';
    this.phaseHistory = []; this.frozenPoses = {};
    for (const [key, model] of Object.entries(this.models)) {
      model.root.rotation.set(0, model.motion.yaw, 0);
      this.frozenPoses[key] = { yaw: model.motion.yaw, pivot: model.root.position.toArray() };
      this.captureBounds(model);
    }
    if (this.button) this.button.disabled = true;
    this.canvas.dataset.transition = 'true'; this.lastTime = null;
    if (this.reduced.matches) { this.timeline.finish(); this.complete(); }
    else this.applyTransition();
    this.wake();
  }
  applyTransition() {
    const stage = this.timeline.snapshot;
    if (this.phaseHistory.at(-1)?.phase !== stage.phase) {
      this.phaseHistory.push({ phase: stage.phase, elapsed: this.timeline.elapsed });
    }
    for (const [key, model] of Object.entries(this.models)) {
      model.root.visible = stage.visible === 'old' ? key === this.old : stage.visible === 'new' ? key === this.incoming : false;
      model.uniforms.uCadMode.value = { erase: 1, draw: 2 }[stage.phase] ?? 0;
      model.uniforms.uCadProgress.value = stage.progress;
      model.uniforms.uStageDuration.value = stage.phase === 'erase' ? TRANSITION.DISASSEMBLE_DURATION : TRANSITION.REBUILD_DURATION;
    }
  }
  complete() {
    this.current = this.incoming;
    for (const [key, model] of Object.entries(this.models)) {
      model.root.visible = key === this.current; model.uniforms.uCadMode.value = 0; model.uniforms.uCadProgress.value = 1;
    }
    this.rotation.motion = this.models[this.current].motion;
    // Zero release velocity eases back to the existing +3 deg/s auto speed,
    // retaining this building's frozen yaw instead of resetting its angle.
    this.rotation.stop(); this.lastTime = null;
    this.phaseHistory.push({ phase: 'complete', elapsed: this.timeline.total });
    if (this.button) this.button.disabled = false;
    this.canvas.dataset.transition = 'false';
  }
  wake() {
    if (!this.ready || this.frame || this.disposed || !this.visible || document.hidden || this.contextLost) return;
    this.frame = requestAnimationFrame(time => this.render(time));
  }
  render(time) {
    this.frame = 0;
    if (!this.ready || this.disposed || !this.visible || document.hidden || this.contextLost) return;
    const dt = this.lastTime == null ? 0 : Math.max(0, (time - this.lastTime) / 1000); this.lastTime = time;
    if (this.timeline.running) {
      this.timeline.advance(dt);
      if (this.timeline.running) this.applyTransition(); else this.complete();
    } else this.rotation.update(dt, this.models[this.current].root);
    const start = performance.now(); this.renderer.render(this.scene, this.camera);
    this.cpuMs = performance.now() - start; this.frames++;
    this.container.dataset.view = JSON.stringify(this.diagnostics);
    if (this.timeline.running || this.rotation.moving) this.wake(); else this.lastTime = null;
  }
  pause() { cancelAnimationFrame(this.frame); this.frame = 0; this.lastTime = null; this.rotation.stop(); }
  get diagnostics() {
    return { ready: this.ready, current: this.current, old: this.old, incoming: this.incoming,
      running: this.timeline.running, elapsed: this.timeline.elapsed, phase: this.timeline.snapshot.phase,
      stageProgress: this.timeline.snapshot.progress, totalDuration: this.timeline.total,
      visibleModels: Object.keys(this.models).filter(key => this.models[key].root.visible),
      frozenPoses: this.frozenPoses, history: this.phaseHistory,
      models: Object.fromEntries(Object.entries(this.models).map(([key, model]) => [key, {
        yaw: model.root.rotation.y, pitch: model.root.rotation.x, roll: model.root.rotation.z,
        pivot: model.root.position.toArray(), segments: model.count, classes: model.classes, paths: model.paths,
        scanBounds: model.uniforms.uScanBounds.value.toArray(), mode: model.uniforms.uCadMode.value,
      }])), camera: this.camera.position.toArray(), frames: this.frames, calls: this.renderer.info.render.calls,
      cpuRenderMs: this.cpuMs, loadMs: this.loadMs, reducedMotion: this.reduced.matches,
      dragging: this.rotation.motion.dragging, angularVelocity: this.rotation.motion.velocity,
      size: { width: this.canvas.clientWidth, height: this.canvas.clientHeight } };
  }
  dispose() {
    this.disposed = true; this.pause(); this.events.abort(); this.rotation.dispose();
    this.resizeObserver.disconnect(); this.intersection.disconnect();
    this.scene.traverse(object => { object.geometry?.dispose(); object.material?.dispose(); }); this.renderer.dispose();
  }
}
