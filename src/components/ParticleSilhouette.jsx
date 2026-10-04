// Adapted from the user-provided React Bits ParticleText component.
// Samples dark image pixels for scene transitions and local cursor repulsion.
// Upstream: https://github.com/DavidHDev/react-bits (MIT + Commons Clause).
// See public/licenses/React-Bits-LICENSE.txt for the full notice.
'use client';

import { useEffect, useRef, useState } from 'react';
import { morphWeights, PARTICLE_MORPH_DURATION } from './particleMotion';
import './ParticleSilhouette.css';

export const PARTICLE_EXIT_DURATION = 680;
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
const smoothstep = (from, to, value) => {
  const t = clamp((value - from) / (to - from), 0, 1);
  return t * t * (3 - 2 * t);
};
const hexToRgb = hex => {
  const clean = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  return [0, 2, 4].map(offset => parseInt(clean.slice(offset, offset + 2), 16));
};
const mixRgb = (from, to, amount) => `rgb(${from.map((channel, i) => Math.round(channel + (to[i] - channel) * amount)).join(',')})`;
const darkness = (data, i) => data[i + 3] / 255 * (1 - (.2126 * data[i] + .7152 * data[i + 1] + .0722 * data[i + 2]) / 255);

const imageMasks = new Map();
const EMPTY_SOURCES = [];
// Prepare fields between frames, rather than doing image analysis on a tab click.
const yieldToBrowser = () => new Promise(resolve => {
  if (window.requestIdleCallback) window.requestIdleCallback(resolve, { timeout: 60 });
  else setTimeout(resolve, 0);
});
const loadSilhouetteMask = src => {
  if (imageMasks.has(src)) return imageMasks.get(src);
  // Analyze the original once. White background pixels never become particles.
  const image = new Image();
  image.decoding = 'async';
  const imageReady = new Promise((resolve, reject) => {
    image.onload = async () => {
      try {
        const source = document.createElement('canvas');
        const sourceCtx = source.getContext('2d', { willReadFrequently: true });
        if (!sourceCtx) throw new Error('Canvas is unavailable');
        const scale = Math.min(1, 1800 / Math.max(image.naturalWidth, image.naturalHeight));
        source.width = Math.ceil(image.naturalWidth * scale);
        source.height = Math.ceil(image.naturalHeight * scale);
        sourceCtx.drawImage(image, 0, 0, source.width, source.height);
        const { data } = sourceCtx.getImageData(0, 0, source.width, source.height);
        let left = source.width, top = source.height, right = -1, bottom = -1;
        let sliceStart = performance.now();
        for (let y = 0; y < source.height; y++) {
          for (let x = 0; x < source.width; x++) {
            if (darkness(data, (y * source.width + x) * 4) <= .45) continue;
            left = Math.min(left, x); right = Math.max(right, x);
            top = Math.min(top, y); bottom = Math.max(bottom, y);
          }
          if (performance.now() - sliceStart > 4) {
            await yieldToBrowser();
            sliceStart = performance.now();
          }
        }
        if (right < left) throw new Error('No silhouette pixels');
        resolve({ source, left, top, width: right - left + 1, height: bottom - top + 1 });
      } catch (error) { reject(error); }
    };
    image.onerror = () => reject(new Error('Unable to load silhouette'));
    image.src = src;
  });
  imageReady.catch(() => {});
  imageMasks.set(src, imageReady);
  return imageReady;
};

const prepareTargets = async (src, width, height, { fit, density, particleSize, stagger }, isCurrent) => {
  const mask = await loadSilhouetteMask(src);
  if (!isCurrent()) throw new Error('Field preparation cancelled');
  const scale = Math.min(width * fit / mask.width, height * fit / mask.height);
  const sampled = document.createElement('canvas');
  sampled.width = Math.max(1, Math.ceil(mask.width * scale));
  sampled.height = Math.max(1, Math.ceil(mask.height * scale));
  const sampleCtx = sampled.getContext('2d', { willReadFrequently: true });
  if (!sampleCtx) throw new Error('Canvas is unavailable');
  sampleCtx.drawImage(mask.source, mask.left, mask.top, mask.width, mask.height, 0, 0, sampled.width, sampled.height);
  const { data } = sampleCtx.getImageData(0, 0, sampled.width, sampled.height);
  const maxSamples = Math.min(36000, Math.max(5000, Math.floor(width * height / 14)));
  const step = Math.max(density, Math.ceil(Math.sqrt(sampled.width * sampled.height / maxSamples)));
  const groups = Array.from({ length: 8 }, () => []);
  let count = 0;
  let sliceStart = performance.now();
  for (let y = step / 2; y < sampled.height; y += step) {
    for (let x = step / 2; x < sampled.width; x += step) {
      const alpha = darkness(data, (Math.floor(y) * sampled.width + Math.floor(x)) * 4);
      if (alpha <= .4) continue;
      const i = count++;
      const seed = ((i * 9301 + 49297) % 233280) / 233280;
      const depth = .65 + (((i * 233 + 97) % 1000) / 1000) * .7;
      const targetX = (width - sampled.width) / 2 + x + (seed - .5) * step * .18;
      const targetY = (height - sampled.height) / 2 + y + (depth - 1) * step * .18;
      const angle = seed * Math.PI * 2;
      const distance = .45 + depth * .75;
      const tint = Math.round(clamp(targetX / Math.max(1, width) * .65 + (seed - .5) * .2, 0, 1) * 7);
      groups[tint].push({
        targetX, targetY, tint, depth, delay: seed * stagger,
        size: Math.max(.6, particleSize * (.85 + alpha * .2 + seed * .12)),
        directionX: Math.cos(angle) * distance, directionY: Math.sin(angle) * distance,
      });
    }
    if (performance.now() - sliceStart > 4) {
      await yieldToBrowser();
      if (!isCurrent()) throw new Error('Field preparation cancelled');
      sliceStart = performance.now();
    }
  }
  if (!count) throw new Error('No silhouette particles');
  // Buckets replace a fresh sort of thousands of particles at each handoff.
  return { src, targets: groups.flat(), step };
};

const ParticleSilhouette = ({
  src,
  alt = '粒子剪影',
  particleSize = 1.65,
  density = 3.5,
  color = '#536049',
  highlightColor = '#929d72',
  scatter = 130,
  gatherDuration = 1400,
  stagger = 240,
  pointerRepel = 72,
  repelRadius = 150,
  fit = .82,
  departing = false,
  retainCloud = false,
  preloadSources = EMPTY_SOURCES,
  className = ''
}) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const departingRef = useRef(departing);
  const retainCloudRef = useRef(retainCloud);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    preloadSources.forEach(source => loadSilhouetteMask(source).catch(() => {}));
  }, [preloadSources]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!container || !canvas || !ctx || !src) return undefined;
    setReady(false);
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reducedMotion = motionQuery.matches;
    let alive = true;
    let visible = false;
    let needsFormation = true;
    let particles = [];
    const baseRgb = hexToRgb(color);
    const highlightRgb = hexToRgb(highlightColor);
    const palette = Array.from({ length: 8 }, (_, i) => baseRgb && highlightRgb ? mixRgb(baseRgb, highlightRgb, i / 7) : color);
    const preparedFields = new Map();
    const preparingFields = new Map();
    let activeSource = null;
    let desiredSource = src;
    let animationFrame = null;
    let resizeFrame = null;
    let geometryVersion = 0;
    let gathering = false;
    let gatherFromCloud = false;
    let gatherStart = 0;
    let morphing = false;
    let morphStart = 0;
    let departureStart = null;
    let hiddenAt = null;
    let lastFrame = 0;
    let width = 0;
    let height = 0;
    let presence = 1;
    let transitionMaxFrameGap = 0;
    const pointer = { active: false, clientX: 0, clientY: 0, x: 0, y: 0 };

    const setPhase = phase => {
      if (container.dataset.phase !== phase) container.dataset.phase = phase;
    };
    const stopLoop = () => {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      animationFrame = null;
      lastFrame = 0;
      pointer.active = false;
    };
    const startGather = (fromScatter = true) => {
      if (!particles.length || reducedMotion) return;
      morphing = false;
      const spread = Math.min(scatter, Math.min(width, height) * .4);
      particles.forEach(particle => {
        if (fromScatter) {
          particle.x = particle.targetX + particle.directionX * spread;
          particle.y = particle.targetY + particle.directionY * spread;
        }
        particle.startX = particle.x;
        particle.startY = particle.y;
        particle.startAlpha = particle.alpha;
        particle.offsetX = particle.offsetY = particle.vx = particle.vy = 0;
      });
      gatherStart = performance.now();
      if (import.meta.env.DEV) transitionMaxFrameGap = 0;
      gathering = true;
      gatherFromCloud = !fromScatter;
      setPhase('gathering');
    };
    const setDeparture = leaving => {
      departingRef.current = leaving;
      if (reducedMotion) { departureStart = null; return; }
      if (leaving) {
        // A second click can change the destination without restarting breakup.
        if (departureStart !== null) return;
        gathering = false;
        morphing = false;
        pointer.active = false;
        departureStart = performance.now();
        particles.forEach(particle => {
          particle.exitX = particle.x;
          particle.exitY = particle.y;
        });
      } else if (departureStart !== null && activeSource === desiredSource) {
        departureStart = null;
        // A cancelled project switch returns from the current scattered positions.
        if (visible) startGather(false);
      }
      ensureRenderLoop();
    };

    const render = now => {
      animationFrame = null;
      if (!alive || !visible || document.hidden || !particles.length) return;
      const moving = !reducedMotion;
      if (import.meta.env.DEV && lastFrame && (gathering || morphing || departureStart !== null)) {
        transitionMaxFrameGap = Math.max(transitionMaxFrameGap, now - lastFrame);
        container.dataset.maxTransitionFrameGap = transitionMaxFrameGap.toFixed(1);
      }
      const dt = lastFrame ? Math.min(now - lastFrame, 50) : 16.67;
      const frameStep = Math.min(dt / 16.67, 2);
      lastFrame = now;
      const rect = container.getBoundingClientRect();
      // On desktop, begin breaking up while the chapter is still largely visible.
      // On long mobile pages, follow the artwork rather than the entire chapter.
      const section = container.closest('#works');
      const chapter = section && window.innerWidth >= 1000 && window.innerHeight >= 560
        ? section.getBoundingClientRect() : rect;
      const edge = Math.max(1, Math.min(chapter.height, window.innerHeight) * .88);
      const targetPresence = clamp(Math.min((window.innerHeight - chapter.top) / edge, chapter.bottom / edge), 0, 1);
      presence = moving ? presence + (targetPresence - presence) * (1 - Math.exp(-dt / 85)) : 1;
      const scrollScatter = Math.pow(1 - presence, .85);
      const exitProgress = departureStart === null ? 0 : clamp((now - departureStart) / PARTICLE_EXIT_DURATION, 0, 1);
      const scattering = departureStart !== null ? easeOutCubic(Math.min(1, exitProgress / .85)) : scrollScatter;
      // Keep particles visible during the breakup; fade only after they spread.
      const sceneAlpha = moving ? (departureStart !== null
        ? (retainCloudRef.current ? 1 : 1 - smoothstep(.42, 1, exitProgress))
        : 1 - smoothstep(.42, 1, scrollScatter)) : 1;
      const spread = Math.min(240, Math.min(width * .24, height * .55));
      const morphProgress = morphing ? clamp((now - morphStart) / PARTICLE_MORPH_DURATION, 0, 1) : 1;
      const morph = morphing ? morphWeights(morphProgress) : null;
      const cloudSpread = Math.min(180, width * .18, height * .35);
      const oldPointerX = pointer.x, oldPointerY = pointer.y;
      if (pointer.active) {
        const follow = 1 - Math.exp(-dt / 65);
        pointer.x += (pointer.clientX - rect.left - pointer.x) * follow;
        pointer.y += (pointer.clientY - rect.top - pointer.y) * follow;
      }
      const flowX = clamp((pointer.x - oldPointerX) / frameStep, -22, 22);
      const flowY = clamp((pointer.y - oldPointerY) / frameStep, -22, 22);
      const radius = Math.min(repelRadius, Math.min(width, height) * .48);
      const radiusSquared = radius * radius;
      const damping = Math.pow(.82, frameStep);
      let complete = true;
      let settling = false;
      let tint = -1;
      let paintAlpha = -1;
      ctx.clearRect(0, 0, width, height);
      ctx.globalAlpha = sceneAlpha;
      for (const particle of particles) {
        if (particle.alpha < .005 && particle.targetAlpha === 0) continue;
        let baseX = particle.targetX;
        let baseY = particle.targetY;
        let progress = 1;
        if (moving && departureStart !== null) {
          baseX = particle.exitX;
          baseY = particle.exitY;
        } else if (morphing && moving) {
          const directionX = particle.startDirectionX * (1 - morph.direction) + particle.directionX * morph.direction;
          const directionY = particle.startDirectionY * (1 - morph.direction) + particle.directionY * morph.direction;
          baseX = particle.startX + (particle.targetX - particle.startX) * morph.blend
            + directionX * cloudSpread * morph.cloud + particle.startVelocityX * PARTICLE_MORPH_DURATION * morph.carry;
          baseY = particle.startY + (particle.targetY - particle.startY) * morph.blend
            + directionY * cloudSpread * morph.cloud + particle.startVelocityY * PARTICLE_MORPH_DURATION * morph.carry;
          particle.alpha = particle.startAlpha + (particle.targetAlpha - particle.startAlpha) * morph.blend;
        } else if (gathering && moving) {
          progress = clamp((now - gatherStart - particle.delay) / Math.max(1, gatherDuration), 0, 1);
          const eased = easeOutCubic(progress);
          baseX = particle.startX + (particle.targetX - particle.startX) * eased;
          baseY = particle.startY + (particle.targetY - particle.startY) * eased;
          particle.alpha = particle.startAlpha + (particle.targetAlpha - particle.startAlpha) * eased;
          if (progress < 1) complete = false;
        }
        if (!moving) particle.alpha = particle.targetAlpha;

        let offsetX = 0, offsetY = 0;
        if (pointer.active && moving && departureStart === null && radius > 0) {
          const dx = baseX - pointer.x, dy = baseY - pointer.y;
          const distanceSquared = dx * dx + dy * dy;
          if (distanceSquared < radiusSquared) {
            const distance = Math.sqrt(distanceSquared);
            const nx = distance > .1 ? dx / distance : particle.directionX;
            const ny = distance > .1 ? dy / distance : particle.directionY;
            const falloff = Math.pow(1 - distance / radius, 2);
            const force = falloff * pointerRepel * particle.depth;
            // Radial pressure, a small curl, and cursor momentum form a local flow.
            offsetX = (nx - ny * .28) * force + flowX * falloff * 1.3;
            offsetY = (ny + nx * .28) * force + flowY * falloff * 1.3;
          }
        }
        if (moving && departureStart === null) {
          particle.vx = (particle.vx + (offsetX - particle.offsetX) * .07 * frameStep) * damping;
          particle.vy = (particle.vy + (offsetY - particle.offsetY) * .07 * frameStep) * damping;
          particle.offsetX += particle.vx * frameStep;
          particle.offsetY += particle.vy * frameStep;
          if (Math.abs(offsetX - particle.offsetX) + Math.abs(offsetY - particle.offsetY) + Math.abs(particle.vx) + Math.abs(particle.vy) > .1) settling = true;
          baseX += particle.offsetX;
          baseY += particle.offsetY;
        }
        if (moving) {
          baseX += particle.directionX * spread * scattering;
          baseY += particle.directionY * spread * scattering;
        }
        particle.motionX = (baseX - particle.x) / dt;
        particle.motionY = (baseY - particle.y) / dt;
        particle.x = baseX;
        particle.y = baseY;
        // Eight palette groups avoid changing Canvas paint for every dense dot.
        if (tint !== particle.tint) { tint = particle.tint; ctx.fillStyle = palette[tint]; }
        const alpha = particle.alpha * (gathering && !gatherFromCloud ? .35 + progress * .65 : 1);
        // Quantized opacity avoids a Canvas state change for every tiny dot.
        const opacity = alpha === 1 ? 1 : Math.round(alpha * 24) / 24;
        if (paintAlpha !== opacity) { paintAlpha = opacity; ctx.globalAlpha = sceneAlpha * opacity; }
        ctx.fillRect(baseX - particle.size / 2, baseY - particle.size / 2, particle.size, particle.size);
      }
      ctx.globalAlpha = 1;
      if (gathering && complete) gathering = false;
      if (morphing && morphProgress === 1) morphing = false;
      if (!moving) { gathering = false; morphing = false; }
      setPhase(!moving ? 'still' : departureStart !== null || scrollScatter > .025 ? 'dispersing' : morphing ? 'morphing' : gathering ? 'gathering' : 'formed');
      const pointerSettling = pointer.active && Math.abs(flowX) + Math.abs(flowY) > .05;
      if (moving && (gathering || morphing || settling || pointerSettling || Math.abs(presence - targetPresence) > .001 || (departureStart !== null && exitProgress < 1))) ensureRenderLoop();
    };

    const ensureRenderLoop = () => {
      if (alive && visible && !document.hidden && particles.length && animationFrame === null) {
        animationFrame = requestAnimationFrame(render);
      }
    };

    const reserveParticles = count => {
      const existingCount = particles.length;
      while (particles.length < count) {
        const template = particles[existingCount ? (particles.length * 997) % existingCount : 0];
        particles.push({
          x: template?.x ?? width / 2, y: template?.y ?? height / 2,
          targetX: 0, targetY: 0, startX: 0, startY: 0, exitX: 0, exitY: 0,
          alpha: 0, targetAlpha: 0, startAlpha: 0,
          size: 0, tint: 0, depth: 1, delay: 0, directionX: 0, directionY: 0,
          motionX: 0, motionY: 0, startDirectionX: 0, startDirectionY: 0, startVelocityX: 0, startVelocityY: 0,
          offsetX: 0, offsetY: 0, vx: 0, vy: 0,
        });
      }
    };
    const getField = source => {
      if (preparingFields.has(source)) return preparingFields.get(source);
      const version = geometryVersion;
      const job = prepareTargets(source, width, height, { fit, density, particleSize, stagger }, () => alive && version === geometryVersion)
        .then(field => {
          if (!alive || version !== geometryVersion) throw new Error('Field preparation cancelled');
          preparedFields.set(source, field);
          reserveParticles(field.targets.length);
          container.dataset.preparedSources = preparedFields.size;
          return field;
        });
      job.catch(() => {});
      preparingFields.set(source, job);
      return job;
    };
    const applyField = field => {
      const handoffStart = import.meta.env.DEV ? performance.now() : 0;
      const isSwitch = activeSource !== null && activeSource !== field.src;
      const isInitial = activeSource === null;
      reserveParticles(field.targets.length);
      for (let i = 0; i < particles.length; i++) {
        const particle = particles[i];
        // Surplus dots remain in the cloud and fade during reassembly. Growing
        // fields reuse dormant dots, so no per-switch particle allocation occurs.
        const target = field.targets[i % field.targets.length];
        if (isSwitch) {
          particle.startX = particle.x;
          particle.startY = particle.y;
          particle.startAlpha = particle.alpha;
          particle.startDirectionX = particle.directionX;
          particle.startDirectionY = particle.directionY;
          particle.startVelocityX = particle.motionX;
          particle.startVelocityY = particle.motionY;
        }
        particle.targetX = target.targetX;
        particle.targetY = target.targetY;
        particle.size = target.size;
        particle.tint = target.tint;
        particle.depth = target.depth;
        particle.delay = target.delay;
        particle.directionX = target.directionX;
        particle.directionY = target.directionY;
        particle.targetAlpha = i < field.targets.length ? 1 : 0;
        if (!isSwitch) {
          particle.x = particle.targetX;
          particle.y = particle.targetY;
          particle.alpha = particle.targetAlpha;
          particle.motionX = particle.motionY = 0;
        }
        particle.offsetX = particle.offsetY = particle.vx = particle.vy = 0;
      }
      activeSource = field.src;
      departureStart = null;
      gathering = false;
      morphing = false;
      // An idle scene has no frames. Do not count that idle interval as a stall.
      lastFrame = 0;
      pointer.active = false;
      container.dataset.source = field.src;
      container.dataset.particleCount = field.targets.length;
      container.dataset.spacing = field.step;
      if (visible && !reducedMotion && (isSwitch || (isInitial && needsFormation))) {
        if (isSwitch) {
          // No exit timer, stagger, or stationary cloud between the two shapes.
          morphing = true;
          morphStart = performance.now();
          if (import.meta.env.DEV) transitionMaxFrameGap = 0;
          setPhase('morphing');
        } else startGather(true);
        needsFormation = false;
      }
      setReady(true);
      if (departingRef.current) setDeparture(true);
      if (import.meta.env.DEV && isSwitch) container.dataset.handoffMs = (performance.now() - handoffStart).toFixed(1);
      ensureRenderLoop();
    };
    const selectSource = source => {
      if (desiredSource === source) return;
      desiredSource = source;
      if (!width || !height || activeSource === source) return;
      // The usual tab handoff only updates cached targets on the existing pool.
      const cached = preparedFields.get(source);
      if (cached) { applyField(cached); return; }
      const version = geometryVersion;
      getField(source).then(field => {
        if (alive && version === geometryVersion && desiredSource === source) applyField(field);
      }).catch(() => {
        if (alive && version === geometryVersion && desiredSource === source) { stopLoop(); setReady(false); }
      });
    };
    engineRef.current = { selectSource, setDeparture };

    const sampleImage = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) { stopLoop(); return; }
      // ResizeObserver also fires on mount. An identical sample must not cancel
      // an entry or morph that already started from the image-load callback.
      if (Math.floor(rect.width) === width && Math.floor(rect.height) === height) return;
      stopLoop();
      geometryVersion += 1;
      preparedFields.clear();
      preparingFields.clear();
      container.dataset.preparedSources = 0;
      width = Math.floor(rect.width);
      height = Math.floor(rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      pointer.x = width / 2;
      pointer.y = height / 2;
      const version = geometryVersion;
      getField(desiredSource).then(field => {
        if (alive && version === geometryVersion && field.src === desiredSource) applyField(field);
      }).catch(() => { if (alive && version === geometryVersion) setReady(false); });
      // Prepare the other silhouettes well before the user selects their tabs.
      preloadSources.filter(source => source !== desiredSource).forEach(source => getField(source).catch(() => {}));
    };

    const queueSample = () => {
      if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => { resizeFrame = null; sampleImage(); });
    };
    const handlePointerMove = event => {
      if (reducedMotion || departingRef.current || (event.pointerType !== 'mouse' && event.pointerType !== 'pen')) return;
      const rect = canvas.getBoundingClientRect();
      if (!pointer.active) { pointer.x = event.clientX - rect.left; pointer.y = event.clientY - rect.top; }
      pointer.clientX = event.clientX;
      pointer.clientY = event.clientY;
      pointer.active = true;
      ensureRenderLoop();
    };
    const handlePointerLeave = () => { pointer.active = false; ensureRenderLoop(); };
    const syncMotion = () => { reducedMotion = motionQuery.matches; ensureRenderLoop(); };
    const syncVisibility = () => {
      if (document.hidden) { hiddenAt = performance.now(); stopLoop(); }
      else {
        if (hiddenAt !== null) {
          const elapsed = performance.now() - hiddenAt;
          gatherStart += elapsed;
          morphStart += elapsed;
          if (departureStart !== null) departureStart += elapsed;
          hiddenAt = null;
        }
        ensureRenderLoop();
      }
    };
    const resumeAfterNavigation = event => {
      if (!event.persisted) return;
      hiddenAt = null;
      departureStart = null;
      if (visible && !reducedMotion) startGather(true);
      else needsFormation = true;
      ensureRenderLoop();
    };
    const resizeObserver = new ResizeObserver(queueSample);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      const wasVisible = visible;
      visible = entry.isIntersecting && entry.intersectionRatio > .02;
      if (!visible) { needsFormation = true; stopLoop(); }
      else {
        if (!wasVisible && needsFormation && activeSource && !reducedMotion && !departingRef.current) {
          startGather(true); needsFormation = false;
        }
        ensureRenderLoop();
      }
    }, { threshold: [0, .02] });
    resizeObserver.observe(container);
    intersectionObserver.observe(container);
    motionQuery.addEventListener('change', syncMotion);
    document.addEventListener('visibilitychange', syncVisibility);
    window.addEventListener('scroll', ensureRenderLoop, { passive: true });
    window.addEventListener('pageshow', resumeAfterNavigation);
    window.addEventListener('pagehide', stopLoop);
    canvas.addEventListener('pointermove', handlePointerMove, { passive: true });
    canvas.addEventListener('pointerleave', handlePointerLeave);
    sampleImage();
    return () => {
      alive = false;
      geometryVersion += 1;
      stopLoop();
      if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      motionQuery.removeEventListener('change', syncMotion);
      document.removeEventListener('visibilitychange', syncVisibility);
      window.removeEventListener('scroll', ensureRenderLoop);
      window.removeEventListener('pageshow', resumeAfterNavigation);
      window.removeEventListener('pagehide', stopLoop);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerleave', handlePointerLeave);
      engineRef.current = null;
    };
    // Source changes are commands to this persistent engine, not effect rebuilds.
  }, [particleSize, density, color, highlightColor, scatter, gatherDuration, stagger, pointerRepel, repelRadius, fit, preloadSources]);

  useEffect(() => {
    departingRef.current = departing;
    retainCloudRef.current = retainCloud;
    engineRef.current?.selectSource(src);
    engineRef.current?.setDeparture(departing);
  }, [src, departing, retainCloud]);

  return <div ref={containerRef} className={`particle-silhouette ${className}`} data-ready={ready} role="img" aria-label={alt}>
    <img className="particle-silhouette__fallback" src={src} alt="" decoding="async" />
    <canvas ref={canvasRef} className="particle-silhouette__canvas" aria-hidden="true" />
  </div>;
};

export default ParticleSilhouette;
