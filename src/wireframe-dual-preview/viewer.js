import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { HorizontalRotation } from './rotation.js';
import { calculateNormalization } from '../pointcloud-test/normalization.js';
import { loadArchitecture } from './data.js';
import { LINE_STYLE, ROTATION } from './config.js';
import { architecturalMaterial, occlusionMaterial } from './line-material.js';

export class ArchitecturalViewer {
  constructor(figure) {
    this.figure = figure; this.model = figure.dataset.model;
    this.viewport = figure.querySelector('.model-viewport'); this.canvas = figure.querySelector('canvas');
    this.events = new AbortController(); this.reduced = matchMedia('(prefers-reduced-motion: reduce)');
    this.visible = true; this.ready = false; this.disposed = false; this.frameCount = 0;
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, LINE_STYLE.maxDPR));
    this.renderer.setClearColor(0, 0);
    this.scene = new THREE.Scene(); this.rotationRoot = new THREE.Group(); this.content = new THREE.Group();
    this.rotationRoot.add(this.content); this.scene.add(this.rotationRoot);
    this.camera = new THREE.PerspectiveCamera(LINE_STYLE.fov, 1, .1, 500);
    this.camera.position.copy(new THREE.Vector3(...LINE_STYLE.cameraDirection).normalize().multiplyScalar(LINE_STYLE.cameraDistance));
    this.camera.lookAt(0, 0, 0);
    this.rotation = new HorizontalRotation(this.canvas, { model: this.model, ready: () => this.ready, reduced: this.reduced, wake: () => this.wake() });
    this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(this.viewport);
    this.intersection = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      if (this.visible) this.wake(); else this.pause();
    }); this.intersection.observe(this.viewport);
    document.addEventListener('visibilitychange', () => document.hidden ? this.pause() : this.wake(), { signal: this.events.signal });
    this.reduced.addEventListener('change', () => { this.rotation.stop(); this.wake(); }, { signal: this.events.signal });
    this.canvas.addEventListener('webglcontextlost', e => {
      e.preventDefault(); this.pause(); this.contextLost = true;
    }, { signal: this.events.signal });
    this.canvas.addEventListener('webglcontextrestored', () => { this.contextLost = false; this.wake(); }, { signal: this.events.signal });
    this.load();
  }
  async load() {
    try {
      const { surface, lines } = await loadArchitecture(this.model, this.events.signal);
      if (this.disposed) return;
      this.positions = surface;
      const surfaceGeometry = new THREE.BufferGeometry();
      surfaceGeometry.setAttribute('position', new THREE.BufferAttribute(surface, 3));
      const occluder = new THREE.Mesh(surfaceGeometry, occlusionMaterial()); occluder.renderOrder = 0;
      const segments = lines.length / 26;
      const endpoints = new Float32Array(segments * 6), a = new Float32Array(segments * 3), b = new Float32Array(segments * 3), kind = new Float32Array(segments);
      for (let s = 0; s < segments; s++) {
        const i = s * 26;
        endpoints.set(lines.subarray(i, i + 3), s * 6); endpoints.set(lines.subarray(i + 13, i + 16), s * 6 + 3);
        a.set(lines.subarray(i + 6, i + 9), s * 3); b.set(lines.subarray(i + 9, i + 12), s * 3); kind[s] = lines[i + 12];
      }
      const geometry = new LineSegmentsGeometry(); geometry.setPositions(endpoints);
      geometry.setAttribute('faceA', new THREE.InstancedBufferAttribute(a, 3));
      geometry.setAttribute('faceB', new THREE.InstancedBufferAttribute(b, 3));
      geometry.setAttribute('structural', new THREE.InstancedBufferAttribute(kind, 1));
      this.lineMaterial = architecturalMaterial();
      const drawing = new LineSegments2(geometry, this.lineMaterial); drawing.renderOrder = 1;
      this.content.add(occluder, drawing); this.segments = segments;
      this.ready = true; this.figure.dataset.ready = 'true'; this.resize();
    } catch (error) {
      if (this.disposed) return;
      const status = this.figure.querySelector('.model-error'); status.hidden = false;
      status.textContent = 'Model preview unavailable'; console.error(error);
    }
  }
  resize() {
    if (this.disposed) return;
    const { width, height } = this.viewport.getBoundingClientRect(); if (!width || !height) return;
    this.renderer.setSize(width, height, false); this.camera.aspect = width / height; this.camera.updateProjectionMatrix();
    this.lineMaterial?.resolution.set(width, height);
    if (this.positions) {
      this.normalization = calculateNormalization(this.positions, { aspect: width / height,
        direction: LINE_STYLE.cameraDirection, distance: LINE_STYLE.cameraDistance, fov: LINE_STYLE.fov,
        targetCoverage: LINE_STYLE.targetCoverage, ...LINE_STYLE.models[this.model] });
      const { scale, center, offset } = this.normalization;
      this.content.scale.setScalar(scale);
      this.content.position.set(...center.map(v => -v * scale));
      // Screen-centering correction stays OUTSIDE rotation: the visual pivot
      // is stationary rather than orbiting with a translated model origin.
      this.rotationRoot.position.set(...offset);
    }
    this.wake();
  }
  wake() {
    if (this.frame || this.disposed || !this.visible || document.hidden || this.contextLost) return;
    this.frame = requestAnimationFrame(time => this.render(time));
  }
  render(time) {
    this.frame = 0;
    if (this.disposed || !this.visible || document.hidden || this.contextLost) return;
    const dt = this.lastTime == null ? 0 : Math.max(0, (time - this.lastTime) / 1000);
    this.lastTime = time; this.rotation.update(dt, this.rotationRoot);
    this.renderer.render(this.scene, this.camera); this.frameCount++; this.lastRenderTime = time;
    this.figure.dataset.view = JSON.stringify(this.diagnostics);
    if (this.rotation.moving) this.wake(); else this.lastTime = null;
  }
  pause() { cancelAnimationFrame(this.frame); this.frame = 0; this.lastTime = null; this.rotation.stop(); }
  get diagnostics() {
    return { model: this.model, ready: this.ready, segments: this.segments, frames: this.frameCount,
      yaw: this.rotation.yaw, pitch: this.rotation.pitch, coverage: this.normalization?.coverage,
      timeMilliseconds: this.lastRenderTime,
      dragging: this.rotation.motion.dragging, angularVelocity: this.rotation.motion.velocity,
      initialDegrees: ROTATION.initialDegrees[this.model], cameraElevation: ROTATION.cameraElevationDegrees,
      rotation: this.rotationRoot.rotation.toArray(), pivot: this.rotationRoot.position.toArray(),
      uniformScale: this.content.scale.toArray(), visible: this.visible,
      size: { width: this.renderer.domElement.clientWidth, height: this.renderer.domElement.clientHeight },
      calls: this.renderer.info.render.calls, points: this.renderer.info.render.points };
  }
  dispose() {
    this.disposed = true; this.pause(); this.events.abort(); this.rotation.dispose();
    this.resizeObserver.disconnect(); this.intersection.disconnect();
    this.content.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); }); this.renderer.dispose();
  }
}
