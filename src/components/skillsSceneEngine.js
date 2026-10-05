import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

const targets = ['monitor', 'robot_arm', 'telephone'];
const ease = t => t * t * (3 - 2 * t);

function disposeModel(model) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  model.traverse(node => {
    if (!node.isMesh) return;
    geometries.add(node.geometry);
    (Array.isArray(node.material) ? node.material : [node.material]).forEach(material => {
      materials.add(material);
      Object.values(material).forEach(value => { if (value?.isTexture) textures.add(value); });
    });
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
  textures.forEach(texture => { texture.dispose(); texture.source.data?.close?.(); });
}

// Static camera and demand rendering: frames run only while an interaction settles.
// Highlighting operates on materials and a screen-space silhouette, never geometry.
export function createSkillsScene(host, callbacks) {
  const mobile = window.innerWidth < 760;
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(Math.max(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75), mobile ? 1.75 : 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .75;
  renderer.setClearColor('#eeefea', 0);
  renderer.domElement.setAttribute('aria-label', '等轴测工作室场景，可选择显示器、机械臂和电话');
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-2, 2, 2, -2, .01, 30);
  const room = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(room, .04);
  scene.environment = environment.texture;
  scene.environmentIntensity = .8;
  room.dispose(); pmrem.dispose();
  scene.add(new THREE.HemisphereLight('#ffffff', '#9b9b96', .55));
  const key = new THREE.DirectionalLight('#ffffff', 1.6);
  key.position.set(-2.5, 7, 3.5);
  key.target.position.set(0, .4, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(mobile ? 2048 : 4096, mobile ? 2048 : 4096);
  Object.assign(key.shadow.camera, { left: -1.8, right: 1.8, top: 1.8, bottom: -1.8, near: .5, far: 15 });
  key.shadow.bias = -.0001;
  key.shadow.normalBias = .004;
  key.shadow.radius = mobile ? 6 : 12;
  key.shadow.intensity = .65;
  scene.add(key.target);
  scene.add(key);
  const fill = new THREE.DirectionalLight('#ffffff', .8);
  fill.position.set(4, 3, -3); scene.add(fill);
  // Static shadow maps are computed once; furniture and floor retain real casts.
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128; shadowCanvas.height = 128;
  const shadowContext = shadowCanvas.getContext('2d');
  const gradient = shadowContext.createRadialGradient(64, 64, 10, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(37,39,36,.16)'); gradient.addColorStop(.55, 'rgba(37,39,36,.09)'); gradient.addColorStop(1, 'rgba(37,39,36,0)');
  shadowContext.fillStyle = gradient; shadowContext.fillRect(0, 0, 128, 128);
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.4), new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false, toneMapped: false }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -.003; scene.add(floor);
  const shadowFloor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: .16 }));
  shadowFloor.rotation.x = -Math.PI / 2; shadowFloor.position.y = -.002;
  shadowFloor.receiveShadow = true; scene.add(shadowFloor);
  const composer = new EffectComposer(renderer);
  composer.renderTarget1.samples = mobile ? 2 : 4;
  composer.renderTarget2.samples = mobile ? 2 : 4;
  const renderPass = new RenderPass(scene, camera);
  const outline = new OutlinePass(new THREE.Vector2(1, 1), scene, camera);
  outline.visibleEdgeColor.set('#dfff00'); outline.hiddenEdgeColor.set('#dfff00');
  outline.edgeThickness = 1.25; outline.edgeGlow = .45; outline.pulsePeriod = 0;
  const output = new OutputPass();
  // Tone mapping premultiplied edge pixels directly produces bright, jagged rims.
  // Resolve their coverage before tone mapping, then composite on the page colour
  // so FXAA sees the real background rather than transparent black.
  output.uniforms.workspaceBackground = { value: new THREE.Color('#eeefea').convertLinearToSRGB() };
  output.material.fragmentShader = output.material.fragmentShader
    .replace('uniform sampler2D tDiffuse;', 'uniform sampler2D tDiffuse;\n uniform vec3 workspaceBackground;')
    .replace('// tone mapping', 'float coverage = clamp(gl_FragColor.a, 0.0, 1.0);\n gl_FragColor.rgb /= max(coverage, 0.0001);\n // tone mapping')
    .replace(/\n\s*}\s*$/, '\n gl_FragColor.rgb = mix(workspaceBackground, gl_FragColor.rgb, coverage);\n gl_FragColor.a = 1.0;\n }');
  const fxaa = new ShaderPass(FXAAShader);
  composer.addPass(renderPass); composer.addPass(outline); composer.addPass(output); composer.addPass(fxaa);

  let model, bounds, width = 1, height = 1, frame = 0, pointerFrame = 0, disposed = false;
  let selected = null, hovered = null, visible = true, transitionStart = 0;
  let outlineFrom = 0, outlineTo = 0;
  const roots = {}, boxes = {}, materials = [];
  const pointer = new THREE.Vector2(), raycaster = new THREE.Raycaster();
  const accent = new THREE.Color('#dfff00');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const abort = new AbortController();
  const corners = box => Array.from({ length: 8 }, (_, i) => new THREE.Vector3(
    i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z));
  const projectBox = box => {
    const points = corners(box).map(p => p.project(camera));
    const x = points.map(p => (p.x + 1) * width / 2), y = points.map(p => (1 - p.y) * height / 2);
    return { x: Math.min(...x), y: Math.min(...y), width: Math.max(...x) - Math.min(...x), height: Math.max(...y) - Math.min(...y) };
  };
  const layout = () => {
    if (!model) return;
    const result = {};
    targets.forEach(name => { result[name] = projectBox(boxes[name]); });
    callbacks.onLayout(result, { width, height });
  };
  const fit = () => {
    if (!bounds) return;
    const center = bounds.getCenter(new THREE.Vector3());
    camera.position.copy(center).add(new THREE.Vector3(4, 4, 4));
    camera.lookAt(center); camera.updateMatrixWorld();
    const points = corners(bounds).map(p => p.applyMatrix4(camera.matrixWorldInverse));
    const halfX = Math.max(...points.map(p => Math.abs(p.x)));
    const halfY = Math.max(...points.map(p => Math.abs(p.y)));
    const halfHeight = Math.max(halfY, halfX / (width / height)) * 1.045;
    camera.top = halfHeight; camera.bottom = -halfHeight;
    camera.right = halfHeight * width / height; camera.left = -camera.right;
    camera.updateProjectionMatrix(); layout();
  };
  const render = now => {
    frame = 0;
    if (disposed || !visible || document.hidden || !model) return;
    const progress = reduced.matches ? 1 : Math.min(1, (now - transitionStart) / 420);
    const mix = ease(progress);
    materials.forEach(record => {
      const dim = THREE.MathUtils.lerp(record.fromDim, record.toDim, mix);
      const glow = THREE.MathUtils.lerp(record.fromGlow, record.toGlow, mix);
      record.dim = dim; record.glow = glow;
      record.material.color.copy(record.color).multiplyScalar(dim);
      record.material.emissive.copy(record.emissive).multiplyScalar(dim);
      record.material.emissive.r += accent.r * glow;
      record.material.emissive.g += accent.g * glow;
      record.material.emissive.b += accent.b * glow;
    });
    outline.edgeStrength = THREE.MathUtils.lerp(outlineFrom, outlineTo, mix);
    outline.enabled = outline.edgeStrength > .001;
    composer.render();
    if (progress < 1) frame = requestAnimationFrame(render);
  };
  const wake = () => { if (!frame && visible && !document.hidden && !disposed) frame = requestAnimationFrame(render); };
  const update = () => {
    const active = hovered || selected;
    if (active && roots[active]) outline.selectedObjects = [roots[active]];
    outlineFrom = outline.edgeStrength; outlineTo = active ? 3.5 : 0;
    materials.forEach(record => {
      record.fromDim = record.dim; record.fromGlow = record.glow;
      record.toDim = active && record.name !== active ? .76 : 1;
      record.toGlow = record.name === active ? .065 : 0;
    });
    transitionStart = performance.now(); wake();
  };
  const hover = name => {
    if (hovered === name) return;
    hovered = name; renderer.domElement.style.cursor = name ? 'pointer' : '';
    callbacks.onHover(name); update();
  };
  const hit = event => {
    if (!model) return null;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    // Test all meshes so furniture correctly occludes the interactive objects.
    let node = raycaster.intersectObject(model, true)[0]?.object;
    while (node && node !== model) {
      if (targets.includes(node.name)) return node.name;
      node = node.parent;
    }
    return null;
  };
  let latestPointer;
  const move = event => {
    if (event.pointerType === 'touch') return;
    latestPointer = { clientX: event.clientX, clientY: event.clientY };
    if (!pointerFrame) pointerFrame = requestAnimationFrame(() => { pointerFrame = 0; hover(hit(latestPointer)); });
  };
  const leave = () => { cancelAnimationFrame(pointerFrame); pointerFrame = 0; hover(null); };
  let down;
  const pointerDown = event => { down = { x: event.clientX, y: event.clientY }; };
  const click = event => {
    if (down && Math.hypot(event.clientX - down.x, event.clientY - down.y) > 8) return;
    callbacks.onSelect(hit(event));
  };
  const resize = () => {
    width = Math.max(1, host.clientWidth); height = Math.max(1, host.clientHeight);
    renderer.setSize(width, height); composer.setSize(width, height); fit(); wake();
    fxaa.uniforms.resolution.value.set(1 / (width * renderer.getPixelRatio()), 1 / (height * renderer.getPixelRatio()));
  };
  const sizeObserver = new ResizeObserver(resize); sizeObserver.observe(host);
  const visibilityObserver = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible) wake(); else { cancelAnimationFrame(frame); frame = 0; }
  }); visibilityObserver.observe(host);
  const visibilityChange = () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else wake(); };
  document.addEventListener('visibilitychange', visibilityChange);
  reduced.addEventListener('change', update);
  renderer.domElement.addEventListener('pointermove', move);
  renderer.domElement.addEventListener('pointerleave', leave);
  renderer.domElement.addEventListener('pointerdown', pointerDown);
  renderer.domElement.addEventListener('click', click);
  const contextLost = event => { event.preventDefault(); callbacks.onError(); };
  renderer.domElement.addEventListener('webglcontextlost', contextLost);

  fetch('/models/portfolio-scene.glb?v=20261006-hq', { signal: abort.signal })
    .then(response => { if (!response.ok) throw new Error('Model unavailable'); return response.arrayBuffer(); })
    .then(buffer => new GLTFLoader().parseAsync(buffer, '/models/'))
    .then(gltf => {
      if (disposed) { disposeModel(gltf.scene); return; }
      model = gltf.scene;
      const lights = [];
      model.traverse(node => { if (node.isLight || node.isCamera) lights.push(node); });
      lights.forEach(node => node.removeFromParent());
      const originals = new Set();
      model.traverse(node => {
        if (!node.isMesh) return;
        node.castShadow = true; node.receiveShadow = true;
        let parent = node;
        while (parent.parent && parent.parent !== model) parent = parent.parent;
        const name = parent.name;
        const clone = material => {
          originals.add(material);
          const copy = material.clone();
          // Keep the small printed decals and screen legible at an oblique angle.
          [copy.map, copy.emissiveMap].filter(Boolean).forEach(texture => {
            texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
          });
          // Preserve the embedded screen image; keep it luminous without clipping the CAD lines.
          if (copy.emissiveIntensity > 1) copy.emissiveIntensity = 1.1;
          materials.push({ name, material: copy, color: copy.color.clone(), emissive: copy.emissive.clone(), dim: 1, glow: 0, fromDim: 1, toDim: 1, fromGlow: 0, toGlow: 0 });
          return copy;
        };
        node.material = Array.isArray(node.material) ? node.material.map(clone) : clone(node.material);
      });
      originals.forEach(material => material.dispose());
      scene.add(model); model.updateMatrixWorld(true);
      targets.forEach(name => {
        roots[name] = model.getObjectByName(name);
        if (!roots[name]) throw new Error(`Missing interactive object: ${name}`);
        boxes[name] = new THREE.Box3().setFromObject(roots[name]);
      });
      bounds = new THREE.Box3().setFromObject(model);
      // Populate the static shadow map before OutlinePass temporarily hides objects.
      renderer.shadowMap.needsUpdate = true;
      floor.visible = false; shadowFloor.visible = false;
      resize(); renderer.render(scene, camera);
      floor.visible = true; shadowFloor.visible = true;
      update(); callbacks.onReady();
    }).catch(error => { if (!disposed && error.name !== 'AbortError') callbacks.onError(error); });

  return {
    select(name) { selected = name; update(); },
    hover,
    dispose() {
      disposed = true; abort.abort(); cancelAnimationFrame(frame); cancelAnimationFrame(pointerFrame);
      sizeObserver.disconnect(); visibilityObserver.disconnect();
      document.removeEventListener('visibilitychange', visibilityChange);
      reduced.removeEventListener('change', update);
      renderer.domElement.removeEventListener('pointermove', move);
      renderer.domElement.removeEventListener('pointerleave', leave);
      renderer.domElement.removeEventListener('pointerdown', pointerDown);
      renderer.domElement.removeEventListener('click', click);
      renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      if (model) disposeModel(model);
      floor.geometry.dispose(); floor.material.dispose(); shadowTexture.dispose();
      shadowFloor.geometry.dispose(); shadowFloor.material.dispose(); key.shadow.dispose();
      environment.dispose(); renderPass.dispose(); outline.dispose(); output.dispose(); fxaa.dispose(); composer.dispose();
      renderer.dispose(); renderer.domElement.remove();
    },
  };
}
