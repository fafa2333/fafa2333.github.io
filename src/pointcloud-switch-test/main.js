import './style.css';
import './theme.js';
import './preview-mode.js';
import * as THREE from 'three';
import { CONFIG } from '../pointcloud-test/config.js';
import { DISPLAY } from '../pointcloud-test/display-config.js';
import { loadPointCloudModel } from '../pointcloud-test/point-cloud-model.js';
import { DragRotation } from '../pointcloud-test/drag-rotation.js';
import { SWITCH } from './config.js';
import { VISUAL, displayDensity } from './visual-config.js';
import { SwitchState } from './state.js';
import { switchPointVertex, switchPointFragment, switchDepthVertex, switchDepthFragment } from './shaders.js';

const canvas = document.querySelector('#pointcloud-canvas');
const viewer = document.querySelector('.pointcloud-viewer');
const button = document.querySelector('#switch-building');
const status = document.querySelector('#load-status');
const diagnostics = document.querySelector('#pointcloud-diagnostics');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const requested = new URLSearchParams(location.search).get('quality');
const qualityName = Object.hasOwn(CONFIG.POINT_VARIANTS, requested) ? requested : CONFIG.DEFAULT_QUALITY;
const state = new SwitchState(SWITCH);
const paper = getComputedStyle(document.documentElement).getPropertyValue(VISUAL.BACKGROUND_VARIABLE).trim();
const scene = new THREE.Scene(); scene.background = new THREE.Color(paper);
document.querySelector('meta[name="theme-color"]').content = paper;
const camera = new THREE.PerspectiveCamera(CONFIG.CAMERA_FOV, 1, .1, 1000);
camera.position.fromArray(CONFIG.CAMERA_DIRECTION).normalize().multiplyScalar(DISPLAY.CAMERA_DISTANCE);
camera.lookAt(0, 0, 0);
const group = new THREE.Group(); scene.add(group);
const models = {};
const events = new AbortController(), loading = new AbortController();
const shaders = { pointVertex: switchPointVertex, pointFragment: switchPointFragment,
  depthVertex: switchDepthVertex, depthFragment: switchDepthFragment };
let renderer, ready = false, disposed = false, visible = true;
let frame = 0, previousTime = 0, time = 0, frames = 0, captureKey = '', historyKey = '';
const history = [], loadStart = performance.now(); let loadMs = 0;
const projection = new THREE.Matrix4(), sample = new THREE.Vector3();
const rotation = new DragRotation(canvas, { ready: () => ready, reduced, wake });
let renderMs = 0; const frameIntervals = [];

function active() { return ready && !disposed && visible && !document.hidden; }
function wake() { if (active() && !frame) frame = requestAnimationFrame(draw); }
function stopFrames() {
  cancelAnimationFrame(frame); frame = 0; previousTime = 0; rotation.stop();
}
function syncButton() {
  const next = state.current === 'bit' ? 'hive' : 'bit';
  button.textContent = `切换至 ${SWITCH.MODELS[next].label}`;
  button.disabled = !ready || state.running;
}
function captureScanBounds() {
  const model = models[state.activeModel]; if (!model) return;
  scene.updateMatrixWorld(true); camera.updateMatrixWorld();
  projection.copy(camera.projectionMatrix).multiply(camera.matrixWorldInverse).multiply(model.points.matrixWorld);
  const positions = model.points.geometry.attributes.aOriginalPosition.array;
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < positions.length; i += 3) {
    sample.fromArray(positions, i).applyMatrix4(projection); min = Math.min(min, sample.x); max = Math.max(max, sample.x);
  }
  model.uniforms.uScanBounds.value.set(min, max);
}
function syncModels() {
  for (const model of Object.values(models)) {
    model.root.visible = model.name === state.activeModel;
    model.setAnimated(state.running && state.phase !== 'blank');
    model.uniforms.uMode.value = state.phase === 'assembling' ? -1 : 1;
    model.uniforms.uProgress.value = state.running ? state.progress : 0;
    model.uniforms.uTime.value = time;
    model.uniforms.uNoise.value = reduced.matches ? 0 : SWITCH.RANDOM_STRENGTH;
  }
  const key = `${state.switches}:${state.phase}:${state.activeModel}`;
  if (captureKey !== key) { captureKey = key; captureScanBounds(); }
  syncButton();
}
function recordDiagnostics(now) {
  const visibleModels = Object.values(models).filter(m => m.root.visible);
  const key = `${state.switches}:${state.phase}`;
  if (historyKey !== key) {
    historyKey = key;
    history.push({ phase: state.phase, current: state.current, active: state.activeModel,
      atMs: now, drawCalls: renderer.info.render.calls, yaw: rotation.yaw, pitch: rotation.pitch });
    if (history.length > 40) history.shift();
  }
  canvas.dataset.phase = state.phase; canvas.dataset.model = state.activeModel || 'none';
  diagnostics.textContent = JSON.stringify({ ready, phase: state.phase, progress: state.progress,
    current: state.current, target: state.target, activeModel: state.activeModel, visibleModels: visibleModels.map(m => m.name),
    switches: state.switches, points: visibleModels.reduce((sum, m) => sum + m.count, 0),
    pointCounts: Object.fromEntries(Object.values(models).map(m => [m.name, m.count])), quality: qualityName,
    durations: { dissolve: SWITCH.DISSOLVE_DURATION, blank: SWITCH.BLANK_DURATION, assemble: SWITCH.ASSEMBLE_DURATION },
    scatterDistance: SWITCH.SCATTER_DISTANCE, randomStrength: SWITCH.RANDOM_STRENGTH,
    cameraPosition: camera.position.toArray(), cameraFov: camera.fov, yaw: rotation.yaw, pitch: rotation.pitch,
    normalization: Object.fromEntries(Object.values(models).map(m => [m.name, m.normalization])),
    attributeVersions: Object.fromEntries(Object.values(models).map(m => [m.name, {
      original: m.points.geometry.attributes.position.version,
      scattered: m.points.geometry.attributes.aScatterPosition.version,
      depth: m.occluder.geometry.attributes.position.data.version,
    }])),
    scanBounds: models[state.activeModel]?.uniforms.uScanBounds.value.toArray(), scanSpace: 'screen', scanDirection: 'left-to-right',
    restingCoordinatesExact: state.phase === 'idle', drawCalls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles, frames, frameScheduled: Boolean(frame),
    loadMs, viewport: { width: viewer.clientWidth, height: viewer.clientHeight }, history,
    appearance: { paper, paperSource: 'src/styles.css: .education-image .image-panel', ink: VISUAL.INK,
      opacity: VISUAL.OPACITY, density: displayDensity(viewer.clientWidth), floorRetention: VISUAL.FLOOR_RETENTION,
      diameterCSS: [VISUAL.MIN_DIAMETER_CSS, VISUAL.MAX_DIAMETER_CSS],
      depthLightening: VISUAL.DEPTH_LIGHTENING, facingLightening: VISUAL.FACING_LIGHTENING,
      sameMaterialAllPhases: true, preview: document.documentElement.dataset.preview || 'large' },
    renderMs, frameIntervals, userAgent: navigator.userAgent,
  });
}
function draw(now) {
  frame = 0; if (!active()) return;
  if (previousTime) { frameIntervals.push(now - previousTime); if (frameIntervals.length > 300) frameIntervals.shift(); }
  const dt = previousTime ? Math.min((now - previousTime) / 1000, .05) : 0;
  previousTime = now; time += dt;
  state.advance(dt); rotation.update(dt, group); syncModels();
  const renderStart = performance.now(); renderer.render(scene, camera); renderMs = performance.now() - renderStart; frames++;
  if (state.running || rotation.moving) frame = requestAnimationFrame(draw);
  else previousTime = 0;
  recordDiagnostics(now);
}
function layout() {
  if (!renderer || disposed) return;
  const { width, height } = viewer.getBoundingClientRect(); if (width < 1 || height < 1) return;
  renderer.setPixelRatio(Math.min(devicePixelRatio, CONFIG.MAX_PIXEL_RATIO)); renderer.setSize(width, height, false);
  camera.aspect = width / height; camera.updateProjectionMatrix();
  for (const model of Object.values(models)) {
    model.normalize(camera.aspect, SWITCH.SCATTER_DISTANCE);
    model.uniforms.uViewportHeight.value = canvas.height; model.uniforms.uViewportWidth.value = canvas.width;
    model.uniforms.uPixelRatio.value = renderer.getPixelRatio();
    model.uniforms.uDisplayDensity.value = displayDensity(width);
  }
  captureScanBounds(); wake();
}
button.addEventListener('click', () => {
  if (!ready || !state.start(reduced.matches)) return;
  // Preserve the current pose; a small residual drag velocity never becomes
  // a camera reset or an unsolicited rotation during the switch.
  rotation.velocityX = rotation.velocityY = 0;
  syncButton(); wake();
}, { signal: events.signal });
const resize = new ResizeObserver(layout); resize.observe(viewer);
const visibility = new IntersectionObserver(([entry]) => {
  visible = entry.isIntersecting; if (visible) wake(); else stopFrames();
}); visibility.observe(viewer);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopFrames(); else wake();
}, { signal: events.signal });
reduced.addEventListener('change', () => {
  rotation.velocityX = rotation.velocityY = 0;
  if (reduced.matches) state.finish(); wake();
}, { signal: events.signal });
canvas.addEventListener('webglcontextlost', e => {
  e.preventDefault(); ready = false; stopFrames(); syncButton();
  status.hidden = false; status.textContent = '图形上下文已暂停，请刷新实验页。';
}, { signal: events.signal });
window.addEventListener('pagehide', e => {
  if (e.persisted) { stopFrames(); return; }
  disposed = true; loading.abort(); stopFrames(); rotation.dispose(); events.abort(); resize.disconnect(); visibility.disconnect();
  for (const model of Object.values(models)) model.dispose(); renderer?.dispose();
});
window.addEventListener('pageshow', e => { if (e.persisted) wake(); });

async function initialize() {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
  layout();
  const loaded = await Promise.allSettled(Object.entries(SWITCH.MODELS).map(([name, info]) => {
    const uniforms = {
      uProgress: { value: 0 }, uMode: { value: 1 }, uScanWindow: { value: SWITCH.SCAN_WINDOW },
      uScanSign: { value: 1 }, uScanBounds: { value: new THREE.Vector2() },
      uTime: { value: 0 }, uNoise: { value: SWITCH.RANDOM_STRENGTH },
      uPointScale: { value: CONFIG.POINT_SIZE / .09 * CONFIG.POINT_VARIANTS[qualityName].radiusGain },
      uViewportHeight: { value: canvas.height }, uViewportWidth: { value: canvas.width }, uInset: { value: CONFIG.DEPTH_INSET },
      uPointInk: { value: new THREE.Color(VISUAL.INK) }, uPaperInk: { value: scene.background.clone() },
      uOpacity: { value: VISUAL.OPACITY }, uDisplayDensity: { value: displayDensity(viewer.clientWidth) },
      uFloorRetention: { value: VISUAL.FLOOR_RETENTION }, uPointSizeGain: { value: VISUAL.POINT_SIZE_GAIN },
      uPixelRatio: { value: renderer.getPixelRatio() },
      uDiameterCSS: { value: new THREE.Vector2(VISUAL.MIN_DIAMETER_CSS, VISUAL.MAX_DIAMETER_CSS) },
      uDepthCenter: { value: DISPLAY.CAMERA_DISTANCE }, uDepthRange: { value: VISUAL.DEPTH_RANGE },
      uDepthLightening: { value: VISUAL.DEPTH_LIGHTENING }, uFacingLightening: { value: VISUAL.FACING_LIGHTENING },
    };
    return loadPointCloudModel({ name, path: info.path, qualityName, uniforms, shaders, signal: loading.signal,
      continuousMaterial: true, materialOptions: { transparent: true, depthWrite: false, alphaToCoverage: false } });
  }));
  const failed = loaded.find(r => r.status === 'rejected');
  if (failed || disposed) {
    for (const r of loaded) if (r.status === 'fulfilled') r.value.dispose();
    if (failed) throw failed.reason; return;
  }
  for (const r of loaded) { models[r.value.name] = r.value; group.add(r.value.root); }
  layout();
  for (const model of Object.values(models)) await model.compile(renderer, scene, camera);
  if (disposed) return;
  ready = true; loadMs = performance.now() - loadStart;
  status.hidden = true; syncModels();
  // One preload frame also completes driver linking in background tabs.
  // Further drawing remains demand-driven and pauses while hidden/offscreen.
  renderer.render(scene, camera); frames++;
  canvas.dataset.loaded = 'true'; recordDiagnostics(performance.now()); wake();
}
initialize().catch(error => {
  if (disposed) return;
  ready = false; stopFrames(); syncButton(); status.hidden = false;
  status.textContent = '点云加载失败，请刷新重试。'; canvas.dataset.error = error.message;
  console.error('Pointcloud switch experiment:', error);
});
