import './style.css';
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { DISPLAY } from './display-config.js';
import { calculateNormalization, normalizePosition } from './normalization.js';
import { parseBinary, random, scatterPosition, ScanState, clampPitch } from './core.js';
import { pointVertex, pointFragment, depthVertex, depthFragment } from './shaders.js';

const canvas = document.querySelector('#pointcloud-canvas');
const viewer = document.querySelector('.pointcloud-viewer');
const button = document.querySelector('#scan-toggle');
const status = document.querySelector('#load-status');
const diagnostics = document.querySelector('#pointcloud-diagnostics');
// Alternative isolated models use this same renderer; BIT retains its defaults.
const dataPath = viewer.dataset.pointcloudPath || CONFIG.DATA_PATH;
const staticOnly = viewer.dataset.static === 'true';
const modelName = viewer.dataset.pointcloudModel || (dataPath === CONFIG.DATA_PATH ? 'bit' : 'hive');
const modelDisplay = DISPLAY.MODELS[modelName];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const requestedQuality = new URLSearchParams(location.search).get('quality');
const qualityName = Object.hasOwn(CONFIG.POINT_VARIANTS, requestedQuality) ? requestedQuality : CONFIG.DEFAULT_QUALITY;
let quality = CONFIG.POINT_VARIANTS[qualityName];
let fullPointCount = CONFIG.FULL_POINT_COUNT;
const scan = new ScanState(CONFIG.SCAN_DURATION, CONFIG.AGGREGATE_DURATION);
const scene = new THREE.Scene(); scene.background = new THREE.Color(CONFIG.PAPER);
const camera = new THREE.PerspectiveCamera(CONFIG.CAMERA_FOV, 1, .1, 1000);
const group = new THREE.Group(); scene.add(group);
const direction = new THREE.Vector3(...CONFIG.CAMERA_DIRECTION).normalize();
const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), direction).normalize();
const uniforms = {
  uProgress: { value: 0 }, uMode: { value: 1 }, uScanWindow: { value: CONFIG.SCAN_WINDOW },
  uScanSign: { value: CONFIG.SCAN_DIRECTION === 'left-to-right' ? 1 : -1 },
  uScanBounds: { value: new THREE.Vector2() },
  uTime: { value: 0 }, uNoise: { value: CONFIG.SCATTER_NOISE },
  uPointScale: { value: CONFIG.POINT_SIZE / .09 * quality.radiusGain },
  uViewportHeight: { value: 1 }, uViewportWidth: { value: 1 }, uInset: { value: CONFIG.DEPTH_INSET },
};
let renderer, points, occluder, ready = false, disposed = false;
let sourcePositions, sourceDepth, normalization, normalizationAspect;
let frame = 0, timer = 0, previousTime = 0, visible = true, time = 0;
let yaw = 0, pitch = 0, velocityX = 0, velocityY = 0, pointer = null;
const yawQuat = new THREE.Quaternion(), pitchQuat = new THREE.Quaternion();
const yAxis = new THREE.Vector3(0, 1, 0), bounds = new THREE.Box3();
const originalBounds = new THREE.Box3(), projection = new THREE.Matrix4(), corner = new THREE.Vector3();
const metrics = { frames: 0, frameIntervals: [], cpuTimes: [], gpuTimes: [], loadMs: 0 };
const loadStart = performance.now();
let gpuExtension, gl;
const queries = [];

function active() { return ready && !disposed && visible && !document.hidden; }
function wake() { if (active() && !frame && !timer) frame = requestAnimationFrame(draw); }
function stopFrames() {
  cancelAnimationFrame(frame); clearTimeout(timer); frame = 0; timer = 0; previousTime = 0;
  velocityX = 0; velocityY = 0; pointer = null; canvas.dataset.dragging = 'false';
}
function rotation() {
  yawQuat.setFromAxisAngle(yAxis, yaw); pitchQuat.setFromAxisAngle(right, pitch);
  group.quaternion.copy(pitchQuat).multiply(yawQuat);
}
function syncButton() { if (button) { button.textContent = scan.label; button.disabled = !ready || scan.running; } }
function mean(a) { return a.length ? a.reduce((sum, n) => sum + n, 0) / a.length : null; }
function boundedPush(a, n) { a.push(n); if (a.length > 240) a.shift(); }
function pollGPU() {
  if (!gpuExtension) return;
  while (queries.length && gl.getQueryParameter(queries[0], gl.QUERY_RESULT_AVAILABLE)) {
    const query = queries.shift();
    if (!gl.getParameter(gpuExtension.GPU_DISJOINT_EXT)) boundedPush(metrics.gpuTimes, gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6);
    gl.deleteQuery(query);
  }
}
function recordDiagnostics() {
  const interval = mean(metrics.frameIntervals);
  diagnostics.textContent = JSON.stringify({
    state: scan.state, progress: scan.progress, mode: scan.mode, staticOnly, dataPath,
    points: points?.geometry.attributes.position.count ?? 0, quality: qualityName,
    frames: metrics.frames, fps: interval ? 1000 / interval : null,
    cpuRenderMs: mean(metrics.cpuTimes), gpuRenderMs: mean(metrics.gpuTimes),
    gpuTimerAvailable: Boolean(gpuExtension), loadMs: metrics.loadMs,
    drawCalls: renderer?.info.render.calls ?? 0, triangles: renderer?.info.render.triangles ?? 0,
    devicePixelRatio: renderer?.getPixelRatio(), bufferWidth: canvas.width, bufferHeight: canvas.height,
    yaw, pitch, verticalLimits: CONFIG.MAX_VERTICAL_ROTATION,
    modelName, normalization, cameraPosition: camera.position.toArray(), cameraFov: camera.fov,
    viewport: { width: viewer.clientWidth, height: viewer.clientHeight },
    scanSpace: 'screen', scanBounds: uniforms.uScanBounds.value.toArray(),
    restingCoordinatesExact: scan.state === 'assembled' &&
      ((scan.mode === 1 && scan.progress === 0) || (scan.mode === -1 && scan.progress === 1)),
    hidden: document.hidden, visible, frameScheduled: Boolean(frame || timer),
    renderer: gl?.getParameter(gl.RENDERER),
  });
  canvas.dataset.state = scan.state;
}

function draw(now) {
  frame = 0;
  if (!active()) return;
  const dt = previousTime ? Math.min((now - previousTime) / 1000, .05) : 0;
  if (dt && (scan.running || Math.abs(velocityX) + Math.abs(velocityY) > .004)) boundedPush(metrics.frameIntervals, (now - previousTime));
  previousTime = now; time += dt;
  scan.advance(dt);
  if (!pointer && !reduced.matches) {
    yaw += velocityX * dt;
    const next = clampPitch(pitch + velocityY * dt, CONFIG.MAX_VERTICAL_ROTATION);
    if (next === pitch) velocityY = 0;
    pitch = next;
    const decay = Math.exp(-dt / CONFIG.ROTATION_INERTIA);
    velocityX *= decay; velocityY *= decay;
    if (Math.abs(velocityX) + Math.abs(velocityY) < .004) velocityX = velocityY = 0;
  }
  rotation(); uniforms.uProgress.value = scan.progress; uniforms.uMode.value = scan.mode;
  uniforms.uTime.value = time; uniforms.uNoise.value = reduced.matches ? 0 : CONFIG.SCATTER_NOISE;
  occluder.visible = scan.state !== 'scattered'; syncButton(); pollGPU();
  let query;
  if (gpuExtension && queries.length < 6) { query = gl.createQuery(); gl.beginQuery(gpuExtension.TIME_ELAPSED_EXT, query); }
  const start = performance.now(); renderer.render(scene, camera);
  boundedPush(metrics.cpuTimes, performance.now() - start);
  if (query) { gl.endQuery(gpuExtension.TIME_ELAPSED_EXT); queries.push(query); }
  metrics.frames++;
  if (scan.running || velocityX || velocityY) frame = requestAnimationFrame(draw);
  else if (scan.state === 'scattered' && !reduced.matches) {
    timer = setTimeout(() => { timer = 0; wake(); }, 1000 / CONFIG.DRIFT_FPS);
  } else previousTime = 0;
  recordDiagnostics();
}

function captureScanBounds() {
  if (originalBounds.isEmpty()) return;
  group.updateMatrixWorld(true); camera.updateMatrixWorld();
  projection.copy(camera.projectionMatrix).multiply(camera.matrixWorldInverse).multiply(group.matrixWorld);
  let min = Infinity, max = -Infinity;
  for (const x of [originalBounds.min.x, originalBounds.max.x]) for (const y of [originalBounds.min.y, originalBounds.max.y]) for (const z of [originalBounds.min.z, originalBounds.max.z]) {
    corner.set(x, y, z).applyMatrix4(projection); min = Math.min(min, corner.x); max = Math.max(max, corner.x);
  }
  // Freeze screen-space traversal bounds at action start. Dragging changes
  // projected point coordinates, never the scan plane's direction or range.
  uniforms.uScanBounds.value.set(min, max);
}
function fitCamera() {
  const { width, height } = viewer.getBoundingClientRect();
  if (!renderer || width < 1 || height < 1) return;
  renderer.setPixelRatio(Math.min(devicePixelRatio, CONFIG.MAX_PIXEL_RATIO));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.position.copy(direction).multiplyScalar(DISPLAY.CAMERA_DISTANCE); camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  if (points && sourcePositions && normalizationAspect !== camera.aspect) normalizeGeometry(camera.aspect);
  uniforms.uViewportHeight.value = canvas.height; uniforms.uViewportWidth.value = canvas.width;
  captureScanBounds(); wake();
}

function normalizeGeometry(aspect) {
  normalizationAspect = aspect;
  normalization = calculateNormalization(sourcePositions, {
    direction: CONFIG.CAMERA_DIRECTION, fov: CONFIG.CAMERA_FOV, distance: DISPLAY.CAMERA_DISTANCE,
    targetCoverage: DISPLAY.TARGET_COVERAGE, scaleMultiplier: modelDisplay.scaleMultiplier, aspect,
  });
  const original = points.geometry.attributes.position, scattered = points.geometry.attributes.aScatterPosition;
  const sample = new THREE.Vector3(); bounds.makeEmpty(); originalBounds.makeEmpty();
  for (let i = 0; i < original.count; i++) {
    const index = i * 3;
    const p = normalizePosition(Array.from(sourcePositions.subarray(index, index + 3)), normalization);
    const seed = Math.floor(i * fullPointCount / quality.count) + 20261008;
    const target = scatterPosition(p, seed, CONFIG.SCATTER_DISTANCE);
    original.array.set(p, index); scattered.array.set(target, index);
    sample.fromArray(p); bounds.expandByPoint(sample); originalBounds.expandByPoint(sample);
    bounds.expandByPoint(sample.fromArray(target));
  }
  original.needsUpdate = true; scattered.needsUpdate = true;
  bounds.expandByScalar(CONFIG.SCATTER_NOISE * .2);
  points.geometry.boundingBox = bounds.clone(); points.geometry.boundingSphere = bounds.getBoundingSphere(new THREE.Sphere());
  const depthBuffer = occluder.geometry.attributes.position.data;
  for (let i = 0; i < sourceDepth.length; i += 6) {
    depthBuffer.array.set(normalizePosition(Array.from(sourceDepth.subarray(i, i + 3)), normalization), i);
  }
  depthBuffer.needsUpdate = true;
  occluder.geometry.computeBoundingBox(); occluder.geometry.computeBoundingSphere();
}

button?.addEventListener('click', () => {
  if (staticOnly || !ready || scan.running) return;
  captureScanBounds();
  if (!scan.start(reduced.matches)) return;
  metrics.frameIntervals.length = 0; metrics.cpuTimes.length = 0; metrics.gpuTimes.length = 0;
  syncButton(); wake();
});
canvas.addEventListener('pointerdown', e => {
  if (!ready || e.button !== 0 || !e.isPrimary) return;
  velocityX = velocityY = 0;
  pointer = { id: e.pointerId, x: e.clientX, y: e.clientY, time: e.timeStamp };
  canvas.setPointerCapture(e.pointerId); canvas.dataset.dragging = 'true'; e.preventDefault();
});
canvas.addEventListener('pointermove', e => {
  if (!pointer || pointer.id !== e.pointerId) return;
  const dx = e.clientX - pointer.x, dy = e.clientY - pointer.y;
  const dt = Math.max(.008, (e.timeStamp - pointer.time) / 1000);
  const deltaYaw = dx * CONFIG.ROTATION_SPEED, deltaPitch = dy * CONFIG.ROTATION_SPEED;
  yaw += deltaYaw; const previous = pitch; pitch = clampPitch(pitch + deltaPitch, CONFIG.MAX_VERTICAL_ROTATION);
  velocityX = THREE.MathUtils.clamp(deltaYaw / dt, -1.4, 1.4);
  velocityY = THREE.MathUtils.clamp((pitch - previous) / dt, -1.4, 1.4);
  Object.assign(pointer, { x: e.clientX, y: e.clientY, time: e.timeStamp });
  rotation(); wake();
});
function release(e) {
  if (!pointer || pointer.id !== e.pointerId) return;
  if (e.type === 'pointercancel' || e.timeStamp - pointer.time > 80 || reduced.matches) velocityX = velocityY = 0;
  pointer = null; canvas.dataset.dragging = 'false';
  if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
  wake();
}
canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release); canvas.addEventListener('lostpointercapture', release);
canvas.addEventListener('keydown', e => {
  const keys = { ArrowLeft: [-.08, 0], ArrowRight: [.08, 0], ArrowUp: [0, -.06], ArrowDown: [0, .06] };
  if (!keys[e.key]) return;
  e.preventDefault(); velocityX = velocityY = 0; yaw += keys[e.key][0];
  pitch = clampPitch(pitch + keys[e.key][1], CONFIG.MAX_VERTICAL_ROTATION); rotation(); wake();
});
const resize = new ResizeObserver(fitCamera); resize.observe(viewer);
const visibility = new IntersectionObserver(([entry]) => {
  visible = entry.isIntersecting;
  if (!visible) stopFrames(); else wake();
}); visibility.observe(viewer);
document.addEventListener('visibilitychange', () => { if (document.hidden) stopFrames(); else wake(); });
reduced.addEventListener('change', () => {
  velocityX = velocityY = 0;
  if (reduced.matches && scan.running) scan.advance(Math.max(CONFIG.SCAN_DURATION, CONFIG.AGGREGATE_DURATION));
  wake();
});
canvas.addEventListener('webglcontextlost', e => {
  e.preventDefault(); ready = false; stopFrames(); syncButton();
  status.hidden = false; status.textContent = '图形上下文已暂停，请刷新实验页。';
});
window.addEventListener('pagehide', event => {
  if (event.persisted) { stopFrames(); return; }
  disposed = true; stopFrames(); resize.disconnect(); visibility.disconnect();
  for (const query of queries) gl?.deleteQuery(query);
  points?.geometry.dispose(); points?.material.dispose(); occluder?.geometry.dispose(); occluder?.material.dispose(); renderer?.dispose();
});
window.addEventListener('pageshow', event => { if (event.persisted) wake(); });

async function fetchData(file) {
  const response = await fetch(dataPath + file);
  if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
  return response.arrayBuffer();
}
async function initialize() {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
  gl = renderer.getContext(); gpuExtension = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  if (dataPath !== CONFIG.DATA_PATH) {
    const response = await fetch(dataPath + 'manifest.json');
    if (!response.ok) throw new Error(`manifest: HTTP ${response.status}`);
    const manifest = await response.json();
    const variant = manifest.variants?.[qualityName];
    if (!variant || variant.radiusGain !== quality.radiusGain || manifest.radius !== CONFIG.POINT_SIZE || manifest.paper !== CONFIG.PAPER) {
      throw new Error('模型点云风格与共享配置不一致');
    }
    quality = { ...quality, file: variant.file, count: variant.count };
    fullPointCount = manifest.pointCount;
  }
  const [pointBuffer, depthBuffer] = await Promise.all([fetchData(quality.file), fetchData('depth.bin')]);
  const returns = parseBinary(pointBuffer, 0x42545043, 10), depth = parseBinary(depthBuffer, 0x42544450, 6);
  const expected = quality.count;
  if (returns.count !== expected) throw new Error('点数量与实验配置不一致，请重新导出数据');
  const original = new Float32Array(returns.count * 3), scattered = new Float32Array(returns.count * 3);
  const normal = new Float32Array(returns.count * 3), ink = new Float32Array(returns.count * 3), seeds = new Float32Array(returns.count * 3);
  const radius = new Float32Array(returns.count);
  for (let i = 0; i < returns.count; i++) {
    const base = i * 10, index = i * 3, p = Array.from(returns.data.subarray(base, base + 3));
    original.set(p, index); normal.set(returns.data.subarray(base + 3, base + 6), index);
    ink.set(returns.data.subarray(base + 6, base + 9), index); radius[i] = returns.data[base + 9];
    const seed = Math.floor(i * fullPointCount / quality.count) + 20261008;
    seeds.set([random(seed + 17), random(seed + 31), random(seed + 73)], index);
  }
  sourcePositions = original.slice(); sourceDepth = depth.data.slice();
  const geometry = new THREE.BufferGeometry(), position = new THREE.BufferAttribute(original, 3);
  geometry.setAttribute('position', position); geometry.setAttribute('aOriginalPosition', position);
  for (const [name, array, size] of [['aScatterPosition', scattered, 3], ['aNormal', normal, 3], ['aInk', ink, 3], ['aRandom', seeds, 3], ['aRadius', radius, 1]]) geometry.setAttribute(name, new THREE.BufferAttribute(array, size));
  const material = new THREE.ShaderMaterial({ uniforms, vertexShader: pointVertex, fragmentShader: pointFragment,
    depthTest: true, depthWrite: true, transparent: false, alphaToCoverage: true });
  points = new THREE.Points(geometry, material); points.renderOrder = 1; group.add(points);
  const depthGeometry = new THREE.BufferGeometry(), interleaved = new THREE.InterleavedBuffer(depth.data, 6);
  depthGeometry.setAttribute('position', new THREE.InterleavedBufferAttribute(interleaved, 3, 0));
  depthGeometry.setAttribute('normal', new THREE.InterleavedBufferAttribute(interleaved, 3, 3));
  const depthMaterial = new THREE.ShaderMaterial({ uniforms, vertexShader: depthVertex, fragmentShader: depthFragment,
    colorWrite: false, depthWrite: true, side: THREE.DoubleSide });
  occluder = new THREE.Mesh(depthGeometry, depthMaterial); occluder.renderOrder = 0; group.add(occluder);
  fitCamera();
  await renderer.compileAsync(scene, camera);
  ready = true; metrics.loadMs = performance.now() - loadStart;
  status.hidden = true; canvas.dataset.loaded = 'true'; syncButton(); wake();
}
initialize().catch(error => {
  ready = false; if (button) button.disabled = true; status.hidden = false; status.textContent = '点云加载失败，请刷新重试。';
  canvas.dataset.error = error.message; console.error('Pointcloud experiment:', error);
});
