import './bit-center-blockout.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const canvas = document.querySelector('#model-canvas');
const status = document.querySelector('#status');
const container = document.querySelector('.viewer');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#f3f4ef');
const camera = new THREE.PerspectiveCamera(36, 1, .1, 900);
// GLB uses standard glTF axes: east = +X, north = -Z, ground = Y=0.
const target = new THREE.Vector3(0, 20, 0);
const views = {
  top: { position: [0, 210, .001], label: '俯视 · NORTH ↑ / EAST →' },
  east: { position: [195, 20, 0], label: '正面 / 东 · EAST' },
  west: { position: [-195, 20, 0], label: '背面 / 西 · WEST' },
  ne: { position: [140, 118, -140], label: '东北 3/4 · NORTH–EAST' },
  sw: { position: [-140, 118, 140], label: '西南 3/4 · SOUTH–WEST' },
};
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
const controls = new OrbitControls(camera, canvas);
controls.target.copy(target);
controls.enableDamping = false; // Demand rendering, no continuous animation loop.
controls.minDistance = 65;
controls.maxDistance = 500;
controls.maxPolarAngle = Math.PI / 2;
let visible = true;
let frame = 0;
let building;

function invalidate() {
  if (frame || !visible || document.hidden) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    renderer.render(scene, camera);
  });
}
controls.addEventListener('change', invalidate);
scene.add(new THREE.HemisphereLight('#ffffff', '#a9ad9b', .9));
const light = new THREE.DirectionalLight('#fff8e9', 3.2);
light.position.set(70, 125, 40);
light.castShadow = true;
light.shadow.mapSize.set(2048, 2048);
Object.assign(light.shadow.camera, { left: -95, right: 95, top: 95, bottom: -95, near: 1, far: 320 });
light.shadow.normalBias = .04;
light.shadow.bias = -.00015;
scene.add(light);
scene.add(light.target);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000),
  new THREE.MeshStandardMaterial({ color: '#f3f4ef', roughness: 1 }));
floor.rotation.x = -Math.PI / 2;
floor.position.y = -.08;
floor.receiveShadow = true;
scene.add(floor);

function chooseView(key) {
  camera.position.fromArray(views[key].position);
  camera.position.sub(target).multiplyScalar(Math.max(1, 1.1 / camera.aspect)).add(target);
  controls.target.copy(target);
  controls.update();
  document.querySelector('#orientation').textContent = views[key].label;
  document.querySelectorAll('[data-view]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.view === key));
  });
  invalidate();
}
document.querySelectorAll('[data-view]').forEach(button => {
  button.addEventListener('click', () => chooseView(button.dataset.view));
});
document.querySelector('#wireframe').addEventListener('change', event => {
  building?.traverse(object => {
    if (!object.isMesh) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach(material => { material.wireframe = event.target.checked; });
  });
  invalidate();
});

new ResizeObserver(() => {
  const { width, height } = container.getBoundingClientRect();
  renderer.setSize(width, height, false);
  const previousFit = Math.max(1, 1.1 / camera.aspect);
  camera.aspect = width / height;
  const nextFit = Math.max(1, 1.1 / camera.aspect);
  camera.position.sub(controls.target).multiplyScalar(nextFit / previousFit).add(controls.target);
  camera.updateProjectionMatrix();
  controls.update();
  invalidate();
}).observe(container);
new IntersectionObserver(([entry]) => {
  visible = entry.isIntersecting;
  if (visible) invalidate();
}).observe(container);
document.addEventListener('visibilitychange', invalidate);
chooseView('ne');
new GLTFLoader().load('/models/bit-center-teaching-building-v6.glb', gltf => {
  building = gltf.scene;
  let triangles = 0;
  building.traverse(object => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;
    triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3;
  });
  scene.add(building);
  status.hidden = true;
  const bounds = new THREE.Box3().setFromObject(building);
  const size = bounds.getSize(new THREE.Vector3());
  document.querySelector('#model-info').textContent = `${triangles.toLocaleString()} triangles · ${size.x.toFixed(1)} × ${size.z.toFixed(1)} × ${size.y.toFixed(1)} 比例单位`;
  // Observable browser checks: no normals/positions are changed for previews.
  canvas.dataset.loaded = 'true';
  canvas.dataset.triangles = String(triangles);
  canvas.dataset.ground = String(bounds.min.y);
  invalidate();
}, undefined, error => {
  status.textContent = '模型加载失败，请刷新重试。';
  console.error('BIT blockout load failed', error);
});
