// Reusable model/data layer for experiments. Existing preview entries are
// untouched. Their exact binary format, normalization and material route remain.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { DISPLAY } from './display-config.js';
import { parseBinary, random, scatterPosition } from './core.js';
import { calculateNormalization, normalizePosition } from './normalization.js';
import { pointVertex, pointFragment, depthVertex, depthFragment } from './shaders.js';

async function fetchFile(path, file, signal) {
  const response = await fetch(path + file, { signal });
  if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
  return response;
}

export async function loadPointCloudModel({ name, path, qualityName = CONFIG.DEFAULT_QUALITY,
  uniforms, shaders = { pointVertex, pointFragment, depthVertex, depthFragment }, signal,
  materialOptions = {}, continuousMaterial = false }) {
  let quality = CONFIG.POINT_VARIANTS[qualityName], fullCount = CONFIG.FULL_POINT_COUNT;
  if (path !== CONFIG.DATA_PATH) {
    const manifest = await (await fetchFile(path, 'manifest.json', signal)).json();
    const variant = manifest.variants?.[qualityName];
    if (!variant || variant.radiusGain !== quality.radiusGain || manifest.radius !== CONFIG.POINT_SIZE || manifest.paper !== CONFIG.PAPER) {
      throw new Error('模型点云风格与共享配置不一致');
    }
    quality = { ...quality, count: variant.count, file: variant.file }; fullCount = manifest.pointCount;
  }
  const [pointBuffer, depthBuffer] = await Promise.all([
    fetchFile(path, quality.file, signal).then(r => r.arrayBuffer()),
    fetchFile(path, 'depth.bin', signal).then(r => r.arrayBuffer()),
  ]);
  const returns = parseBinary(pointBuffer, 0x42545043, 10), depth = parseBinary(depthBuffer, 0x42544450, 6);
  if (returns.count !== quality.count) throw new Error('点数量与共享配置不一致');
  const source = new Float32Array(returns.count * 3), normal = new Float32Array(source.length);
  const ink = new Float32Array(source.length), randoms = new Float32Array(source.length), radii = new Float32Array(returns.count);
  for (let i = 0; i < returns.count; i++) {
    const index = i * 3, base = i * 10, seed = Math.floor(i * fullCount / quality.count) + 20261008;
    source.set(returns.data.subarray(base, base + 3), index);
    normal.set(returns.data.subarray(base + 3, base + 6), index);
    ink.set(returns.data.subarray(base + 6, base + 9), index); radii[i] = returns.data[base + 9];
    randoms.set([random(seed + 17), random(seed + 31), random(seed + 73)], index);
  }
  const geometry = new THREE.BufferGeometry(), position = new THREE.BufferAttribute(source.slice(), 3);
  geometry.setAttribute('position', position); geometry.setAttribute('aOriginalPosition', position);
  for (const [key, array, size] of [['aScatterPosition', source.slice(), 3], ['aNormal', normal, 3],
    ['aInk', ink, 3], ['aRandom', randoms, 3], ['aRadius', radii, 1]]) {
    geometry.setAttribute(key, new THREE.BufferAttribute(array, size));
  }
  const staticMaterial = new THREE.ShaderMaterial({ uniforms, vertexShader: shaders.pointVertex,
    fragmentShader: shaders.pointFragment, depthTest: true, depthWrite: true, transparent: false, alphaToCoverage: true,
    ...materialOptions });
  const animatedMaterial = continuousMaterial ? staticMaterial : new THREE.ShaderMaterial({ uniforms, vertexShader: shaders.pointVertex,
    fragmentShader: shaders.pointFragment, depthTest: true, depthWrite: false, transparent: true, alphaToCoverage: false,
    ...materialOptions });
  const points = new THREE.Points(geometry, staticMaterial); points.renderOrder = 1;
  const depthGeometry = new THREE.BufferGeometry(), sourceDepth = depth.data.slice();
  const interleaved = new THREE.InterleavedBuffer(depth.data, 6);
  depthGeometry.setAttribute('position', new THREE.InterleavedBufferAttribute(interleaved, 3, 0));
  depthGeometry.setAttribute('normal', new THREE.InterleavedBufferAttribute(interleaved, 3, 3));
  const depthMaterial = new THREE.ShaderMaterial({ uniforms, vertexShader: shaders.depthVertex,
    fragmentShader: shaders.depthFragment, colorWrite: false, depthWrite: true, side: THREE.DoubleSide });
  const occluder = new THREE.Mesh(depthGeometry, depthMaterial); occluder.renderOrder = 0;
  const root = new THREE.Group(); root.name = name; root.add(occluder, points); root.visible = false;
  const originalBounds = new THREE.Box3();
  let lastAspect, normalization;
  return {
    name, root, points, occluder, uniforms, originalBounds, count: returns.count, quality,
    get normalization() { return normalization; },
    normalize(aspect, scatterDistance) {
      if (lastAspect === aspect) return;
      lastAspect = aspect;
      normalization = calculateNormalization(source, { aspect, direction: CONFIG.CAMERA_DIRECTION,
        fov: CONFIG.CAMERA_FOV, distance: DISPLAY.CAMERA_DISTANCE, targetCoverage: DISPLAY.TARGET_COVERAGE,
        scaleMultiplier: DISPLAY.MODELS[name].scaleMultiplier });
      const target = geometry.attributes.aScatterPosition, bounds = new THREE.Box3(), sample = new THREE.Vector3();
      originalBounds.makeEmpty();
      for (let i = 0; i < returns.count; i++) {
        const index = i * 3, p = normalizePosition(Array.from(source.subarray(index, index + 3)), normalization);
        const displaced = scatterPosition(p, Math.floor(i * fullCount / quality.count) + 20261008, scatterDistance);
        position.array.set(p, index); target.array.set(displaced, index);
        sample.fromArray(p); originalBounds.expandByPoint(sample); bounds.expandByPoint(sample);
        bounds.expandByPoint(sample.fromArray(displaced));
      }
      position.needsUpdate = true; target.needsUpdate = true;
      bounds.expandByScalar(1); geometry.boundingBox = bounds;
      geometry.boundingSphere = bounds.getBoundingSphere(new THREE.Sphere());
      for (let i = 0; i < sourceDepth.length; i += 6) {
        interleaved.array.set(normalizePosition(Array.from(sourceDepth.subarray(i, i + 3)), normalization), i);
      }
      interleaved.needsUpdate = true; depthGeometry.computeBoundingBox(); depthGeometry.computeBoundingSphere();
    },
    setAnimated(moving) { points.material = moving ? animatedMaterial : staticMaterial; },
    async compile(renderer, scene, camera) {
      root.visible = true;
      await renderer.compileAsync(scene, camera);
      if (animatedMaterial !== staticMaterial) {
        points.material = animatedMaterial; await renderer.compileAsync(scene, camera);
      }
      points.material = staticMaterial; root.visible = false;
    },
    dispose() {
      geometry.dispose(); depthGeometry.dispose(); staticMaterial.dispose();
      if (animatedMaterial !== staticMaterial) animatedMaterial.dispose();
      depthMaterial.dispose();
    },
  };
}
