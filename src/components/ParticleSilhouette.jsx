// Adapted from the user-provided React Bits ParticleText component.
// Samples dark image pixels for scene transitions and local cursor repulsion.
// Upstream: https://github.com/DavidHDev/react-bits (MIT + Commons Clause).
// See public/licenses/React-Bits-LICENSE.txt for the full notice.
'use client';

import { useEffect, useRef, useState } from 'react';
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
const loadSilhouetteMask = src => {
  if (imageMasks.has(src)) return imageMasks.get(src);
  // Analyze the original once. White background pixels never become particles.
  const image = new Image();
  image.decoding = 'async';
  const imageReady = new Promise((resolve, reject) => {
    image.onload = () => {
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
        for (let y = 0; y < source.height; y++) {
          for (let x = 0; x < source.width; x++) {
            if (darkness(data, (y * source.width + x) * 4) <= .45) continue;
            left = Math.min(left, x); right = Math.max(right, x);
            top = Math.min(top, y); bottom = Math.max(bottom, y);
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
  const departureRef = useRef(null);
  const departingRef = useRef(departing);
  const retainCloudRef = useRef(retainCloud);
  const fieldRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    preloadSources.forEach(source => loadSilhouetteMask(source).catch(() => {}));
  }, [preloadSources]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!container || !canvas || !ctx || !src) return undefined;
    const previousField = fieldRef.current;
    const transferringCloud = previousField?.src !== src && previousField?.particles.length > 0;
    if (!transferringCloud) setReady(false);
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reducedMotion = motionQuery.matches;
    let alive = true;
    let visible = false;
    let needsFormation = true;
    let entryFromCloud = transferringCloud;
    let particles = [];
    let palette = [];
    let animationFrame = null;
    let resizeFrame = null;
    let buildId = 0;
    let gathering = false;
    let gatherFromCloud = false;
    let gatherStart = 0;
    let departureStart = null;
    let hiddenAt = null;
    let lastFrame = 0;
    let width = 0;
    let height = 0;
    let presence = 1;
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
      const spread = Math.min(scatter, Math.min(width, height) * .4);
      particles.forEach(particle => {
        if (fromScatter) {
          particle.x = particle.targetX + particle.directionX * spread;
          particle.y = particle.targetY + particle.directionY * spread;
        }
        particle.startX = particle.x;
        particle.startY = particle.y;
        particle.offsetX = particle.offsetY = particle.vx = particle.vy = 0;
      });
      gatherStart = performance.now();
      gathering = true;
      gatherFromCloud = !fromScatter;
      setPhase('gathering');
    };
    const setDeparture = leaving => {
      departingRef.current = leaving;
      if (leaving) {
        gathering = false;
        pointer.active = false;
        departureStart = performance.now();
        particles.forEach(particle => {
          particle.exitX = particle.x;
          particle.exitY = particle.y;
        });
      } else if (departureStart !== null) {
        departureStart = null;
        // A cancelled project switch returns from the current scattered positions.
        if (visible) startGather(false);
      }
      ensureRenderLoop();
    };
    departureRef.current = setDeparture;

    const render = now => {
      animationFrame = null;
      if (!alive || !visible || document.hidden || !particles.length) return;
      const moving = !reducedMotion;
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
      ctx.clearRect(0, 0, width, height);
      ctx.globalAlpha = sceneAlpha;
      for (const particle of particles) {
        let baseX = particle.targetX;
        let baseY = particle.targetY;
        let progress = 1;
        if (moving && departureStart !== null) {
          baseX = particle.exitX;
          baseY = particle.exitY;
        } else if (gathering && moving) {
          progress = clamp((now - gatherStart - particle.delay) / Math.max(1, gatherDuration), 0, 1);
          const eased = easeOutCubic(progress);
          baseX = particle.startX + (particle.targetX - particle.startX) * eased;
          baseY = particle.startY + (particle.targetY - particle.startY) * eased;
          if (progress < 1) complete = false;
        }

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
        particle.x = baseX;
        particle.y = baseY;
        // Eight palette groups avoid changing Canvas paint for every dense dot.
        if (tint !== particle.tint) { tint = particle.tint; ctx.fillStyle = palette[tint]; }
        if (gathering) ctx.globalAlpha = sceneAlpha * (gatherFromCloud ? 1 : .35 + progress * .65);
        ctx.fillRect(baseX - particle.size / 2, baseY - particle.size / 2, particle.size, particle.size);
      }
      ctx.globalAlpha = 1;
      if (gathering && complete) gathering = false;
      if (!moving) gathering = false;
      setPhase(!moving ? 'still' : departureStart !== null || scrollScatter > .025 ? 'dispersing' : gathering ? 'gathering' : 'formed');
      const pointerSettling = pointer.active && Math.abs(flowX) + Math.abs(flowY) > .05;
      if (moving && (gathering || settling || pointerSettling || Math.abs(presence - targetPresence) > .001 || (departureStart !== null && exitProgress < 1))) ensureRenderLoop();
    };

    const ensureRenderLoop = () => {
      if (alive && visible && !document.hidden && particles.length && animationFrame === null) {
        animationFrame = requestAnimationFrame(render);
      }
    };

    const imageReady = loadSilhouetteMask(src);

    const sampleImage = async () => {
      const currentBuild = ++buildId;
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) { stopLoop(); return; }
      // ResizeObserver also fires on mount. An identical sample must not cancel
      // an entry or morph that already started from the image-load callback.
      if (particles.length && Math.floor(rect.width) === width && Math.floor(rect.height) === height) return;
      try {
        const mask = await imageReady;
        if (!alive || currentBuild !== buildId) return;
        stopLoop();
        width = Math.floor(rect.width);
        height = Math.floor(rect.height);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.max(1, Math.round(width * dpr));
        canvas.height = Math.max(1, Math.round(height * dpr));
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const scale = Math.min(width * fit / mask.width, height * fit / mask.height);
        const sampled = document.createElement('canvas');
        sampled.width = Math.max(1, Math.ceil(mask.width * scale));
        sampled.height = Math.max(1, Math.ceil(mask.height * scale));
        const sampleCtx = sampled.getContext('2d', { willReadFrequently: true });
        if (!sampleCtx) return;
        sampleCtx.drawImage(mask.source, mask.left, mask.top, mask.width, mask.height, 0, 0, sampled.width, sampled.height);
        const { data } = sampleCtx.getImageData(0, 0, sampled.width, sampled.height);
        // A denser uniform field with a bounded budget, including on large screens.
        const maxSamples = Math.min(36000, Math.max(5000, Math.floor(width * height / 14)));
        const step = Math.max(density, Math.ceil(Math.sqrt(sampled.width * sampled.height / maxSamples)));
        const baseRgb = hexToRgb(color);
        const highlightRgb = hexToRgb(highlightColor);
        palette = Array.from({ length: 8 }, (_, i) => baseRgb && highlightRgb ? mixRgb(baseRgb, highlightRgb, i / 7) : color);
        particles = [];
        for (let y = step / 2; y < sampled.height; y += step) {
          for (let x = step / 2; x < sampled.width; x += step) {
            const alpha = darkness(data, (Math.floor(y) * sampled.width + Math.floor(x)) * 4);
            if (alpha <= .4) continue;
            const i = particles.length;
            const seed = ((i * 9301 + 49297) % 233280) / 233280;
            const depth = .65 + (((i * 233 + 97) % 1000) / 1000) * .7;
            const targetX = (width - sampled.width) / 2 + x + (seed - .5) * step * .18;
            const targetY = (height - sampled.height) / 2 + y + (depth - 1) * step * .18;
            const angle = seed * Math.PI * 2;
            const distance = .45 + depth * .75;
            particles.push({
              x: targetX, y: targetY, startX: targetX, startY: targetY,
              targetX, targetY, exitX: targetX, exitY: targetY,
              size: Math.max(.6, particleSize * (.85 + alpha * .2 + seed * .12)),
              tint: Math.round(clamp(targetX / Math.max(1, width) * .65 + (seed - .5) * .2, 0, 1) * 7),
              directionX: Math.cos(angle) * distance, directionY: Math.sin(angle) * distance,
              offsetX: 0, offsetY: 0, vx: 0, vy: 0,
              seed, depth, delay: seed * stagger
            });
          }
        }
        particles.sort((a, b) => a.tint - b.tint);
        if (!particles.length) return;
        if (entryFromCloud && needsFormation) {
          particles.forEach((particle, i) => {
            const previous = previousField.particles[Math.floor(i * previousField.particles.length / particles.length)];
            particle.x = previous.x / previousField.width * width;
            particle.y = previous.y / previousField.height * height;
          });
        }
        container.dataset.particleCount = particles.length;
        container.dataset.spacing = step;
        pointer.x = width / 2;
        pointer.y = height / 2;
        // Resizing an already visible scene only rebuilds its targets.
        if (departingRef.current) setDeparture(true);
        else if (visible && needsFormation && !reducedMotion) {
          startGather(!entryFromCloud); needsFormation = false; entryFromCloud = false;
        }
        else gathering = false;
        setReady(true);
        ensureRenderLoop();
      } catch {
        if (alive && currentBuild === buildId) { stopLoop(); setReady(false); }
      }
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
        if (!wasVisible && needsFormation && particles.length && !reducedMotion && !departingRef.current) {
          startGather(!entryFromCloud); needsFormation = false; entryFromCloud = false;
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
      buildId += 1;
      // The canvas stays mounted between particle projects. Carry the scattered
      // field across the source change instead of starting a separate fade-in.
      fieldRef.current = { src, width, height, particles: particles.map(({ x, y }) => ({ x, y })) };
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
      departureRef.current = null;
    };
  }, [src, particleSize, density, color, highlightColor, scatter, gatherDuration, stagger, pointerRepel, repelRadius, fit]);

  useEffect(() => { departingRef.current = departing; departureRef.current?.(departing); }, [departing]);
  useEffect(() => { retainCloudRef.current = retainCloud; }, [retainCloud]);

  return <div ref={containerRef} className={`particle-silhouette ${className}`} data-ready={ready} role="img" aria-label={alt}>
    <img className="particle-silhouette__fallback" src={src} alt="" decoding="async" />
    <canvas ref={canvasRef} className="particle-silhouette__canvas" aria-hidden="true" />
  </div>;
};

export default ParticleSilhouette;
