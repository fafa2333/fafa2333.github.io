// Adapted from the user-provided React Bits ParticleText component.
// Uses the same scatter/gather and cursor repulsion, sampling dark image pixels.
// Upstream: https://github.com/DavidHDev/react-bits (MIT + Commons Clause).
// See public/licenses/React-Bits-LICENSE.txt for the full notice.
'use client';

import { useEffect, useRef, useState } from 'react';
import './ParticleSilhouette.css';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
const hexToRgb = hex => {
  const clean = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  return [0, 2, 4].map(offset => parseInt(clean.slice(offset, offset + 2), 16));
};
const mixRgb = (from, to, amount) => `rgb(${from.map((channel, i) => Math.round(channel + (to[i] - channel) * amount)).join(',')})`;
const darkness = (data, i) => data[i + 3] / 255 * (1 - (.2126 * data[i] + .7152 * data[i + 1] + .0722 * data[i + 2]) / 255);

const ParticleSilhouette = ({
  src,
  alt = '粒子剪影',
  particleSize = 2,
  density = 4,
  color = '#536049',
  highlightColor = '#929d72',
  scatter = 90,
  gatherDuration = 1500,
  stagger = 280,
  pointerRepel = 28,
  repelRadius = 100,
  idleDrift = .35,
  trigger = 'hover',
  fit = .82,
  glow = false,
  paused = false,
  departing = false,
  replayToken = 0,
  className = ''
}) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const replayRef = useRef(null);
  const syncRef = useRef(null);
  const pausedRef = useRef(paused);
  const departingRef = useRef(departing);
  const [ready, setReady] = useState(false);

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
    let firstFormation = true;
    let particles = [];
    let animationFrame = null;
    let resizeFrame = null;
    let buildId = 0;
    let gathering = false;
    let settling = false;
    let gatherStart = 0;
    let lastFrame = 0;
    let width = 0;
    let height = 0;
    let presence = 0;
    const pointer = { active: false, x: 0, y: 0, smoothX: 0, smoothY: 0 };

    const motionEnabled = () => !reducedMotion && !pausedRef.current;
    const stopLoop = () => {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      animationFrame = null;
      lastFrame = 0;
      pointer.active = false;
    };

    const startGather = (fromScatter = true) => {
      if (!particles.length || !motionEnabled()) return;
      const spread = Math.min(scatter, Math.min(width, height) * .28);
      particles.forEach(particle => {
        if (fromScatter) {
          const angle = particle.seed * Math.PI * 2;
          const distance = spread * (.35 + particle.depth * .75);
          particle.x = particle.targetX + Math.cos(angle) * distance + (particle.depth - .5) * spread * .55;
          particle.y = particle.targetY + Math.sin(angle) * distance + (particle.seed - .5) * spread * .55;
        }
        particle.startX = particle.x;
        particle.startY = particle.y;
        particle.delay = particle.seed * stagger;
      });
      gatherStart = performance.now();
      gathering = true;
      settling = true;
    };

    const render = now => {
      animationFrame = null;
      if (!alive || !visible || document.hidden || !particles.length) return;
      const moving = motionEnabled();
      const dt = lastFrame ? Math.min(now - lastFrame, 50) : 16.67;
      lastFrame = now;
      const follow = moving ? 1 - Math.pow(.78, dt / 16.67) : 1;
      const pointerFollow = 1 - Math.pow(.82, dt / 16.67);
      const rect = container.getBoundingClientRect();
      const edge = Math.max(1, Math.min(height, window.innerHeight) * .55);
      const targetPresence = departingRef.current ? 0 : clamp(Math.min((window.innerHeight - rect.top) / edge, rect.bottom / edge), 0, 1);
      presence = moving ? presence + (targetPresence - presence) * (1 - Math.exp(-dt / 75)) : 1;
      const dispersed = 1 - easeOutCubic(presence);
      const spread = Math.min(scatter, Math.min(width, height) * .28);
      pointer.smoothX += (pointer.x - pointer.smoothX) * pointerFollow;
      pointer.smoothY += (pointer.y - pointer.smoothY) * pointerFollow;
      ctx.clearRect(0, 0, width, height);
      ctx.shadowBlur = glow && moving ? particleSize * 3 : 0;
      ctx.shadowColor = highlightColor;
      let complete = true;
      let hasDisplacement = false;
      particles.forEach(particle => {
        let baseX = particle.targetX;
        let baseY = particle.targetY;
        let progress = 1;
        if (gathering && moving) {
          progress = clamp((now - gatherStart - particle.delay) / Math.max(1, gatherDuration), 0, 1);
          const eased = easeOutCubic(progress);
          baseX = particle.startX + (particle.targetX - particle.startX) * eased;
          baseY = particle.startY + (particle.targetY - particle.startY) * eased;
          if (progress < 1) complete = false;
        } else if (moving && idleDrift > 0) {
          baseX += Math.sin(now * .0009 + particle.seed * 10) * idleDrift * particle.depth;
          baseY += Math.cos(now * .00075 + particle.depth * 10) * idleDrift * particle.depth;
        }
        if (pointer.active && moving && pointerRepel > 0 && repelRadius > 0) {
          const dx = baseX - pointer.smoothX;
          const dy = baseY - pointer.smoothY;
          const distance = Math.hypot(dx, dy);
          if (distance > 0 && distance < repelRadius) {
            const force = Math.pow(1 - distance / repelRadius, 2) * pointerRepel;
            baseX += dx / distance * force;
            baseY += dy / distance * force;
          }
        }
        if (moving && dispersed > .001) {
          const angle = particle.seed * Math.PI * 2;
          const distance = spread * (1 + particle.depth) * dispersed;
          baseX += Math.cos(angle) * distance;
          baseY += Math.sin(angle) * distance;
        }
        particle.x += (baseX - particle.x) * follow;
        particle.y += (baseY - particle.y) * follow;
        if (Math.abs(baseX - particle.x) + Math.abs(baseY - particle.y) > .05) hasDisplacement = true;
        ctx.globalAlpha = clamp(.35 + progress * .65, 0, 1) * presence;
        ctx.fillStyle = particle.color;
        const size = particle.size;
        if (size <= 2.1) ctx.fillRect(particle.x - size / 2, particle.y - size / 2, size, size);
        else {
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      if (gathering && complete) gathering = false;
      if (!moving) { gathering = false; settling = false; }
      else settling = hasDisplacement;
      if (moving && (gathering || settling || pointer.active || idleDrift > 0 || Math.abs(presence - targetPresence) > .001)) ensureRenderLoop();
    };

    const ensureRenderLoop = () => {
      if (alive && visible && !document.hidden && particles.length && animationFrame === null) {
        animationFrame = requestAnimationFrame(render);
      }
    };

    // Analyze the original file once. White pixels are background, not targets.
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
    // Keep a failed load handled even if the containing project is initially hidden.
    imageReady.catch(() => {});

    const sampleImage = async () => {
      const currentBuild = ++buildId;
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) { stopLoop(); return; }
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
        const maxParticles = Math.min(5200, Math.max(1200, Math.floor(width * height / 90)));
        // Adaptive spacing keeps the field uniform instead of dropping entire rows.
        const step = Math.max(2, density, Math.ceil(Math.sqrt(sampled.width * sampled.height / maxParticles)));
        const targets = [];
        for (let y = step / 2; y < sampled.height; y += step) {
          for (let x = step / 2; x < sampled.width; x += step) {
            const alpha = darkness(data, (Math.floor(y) * sampled.width + Math.floor(x)) * 4);
            if (alpha > .4) targets.push({ x: (width - sampled.width) / 2 + x, y: (height - sampled.height) / 2 + y, alpha });
          }
        }
        const baseRgb = hexToRgb(color);
        const highlightRgb = hexToRgb(highlightColor);
        particles = targets.map((target, i) => {
          const seed = ((i * 9301 + 49297) % 233280) / 233280;
          const depth = .45 + (((i * 233 + 97) % 1000) / 1000) * .9;
          const blend = clamp(target.x / Math.max(1, width) * .65 + (seed - .5) * .2, 0, 1);
          return {
            x: target.x, y: target.y, startX: target.x, startY: target.y,
            targetX: target.x, targetY: target.y,
            size: Math.max(.6, particleSize * (.75 + target.alpha * .45)),
            color: baseRgb && highlightRgb ? mixRgb(baseRgb, highlightRgb, blend) : color,
            seed, depth, delay: seed * stagger
          };
        });
        if (!particles.length) return;
        pointer.x = pointer.smoothX = width / 2;
        pointer.y = pointer.smoothY = height / 2;
        firstFormation = true;
        presence = 0;
        if (visible && motionEnabled()) { startGather(true); firstFormation = false; }
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
      if (!motionEnabled() || (event.pointerType !== 'mouse' && event.pointerType !== 'pen')) return;
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active = true;
      ensureRenderLoop();
    };
    const handlePointerLeave = () => { pointer.active = false; settling = true; ensureRenderLoop(); };
    const handlePointerEnter = event => {
      handlePointerMove(event);
      if (event.pointerType === 'mouse' && trigger === 'hover') startGather(true);
      ensureRenderLoop();
    };
    const replay = () => {
      if (!motionEnabled()) return;
      startGather(true);
      ensureRenderLoop();
    };
    replayRef.current = replay;
    const handleClick = () => { if (trigger === 'click') replay(); };
    const syncMotion = () => { reducedMotion = motionQuery.matches; ensureRenderLoop(); };
    syncRef.current = syncMotion;
    const syncVisibility = () => {
      if (document.hidden || !visible) stopLoop();
      else { if (gathering) startGather(false); ensureRenderLoop(); }
    };
    const resumeAfterNavigation = () => {
      presence = 0;
      firstFormation = true;
      if (visible && motionEnabled()) { startGather(true); firstFormation = false; }
      syncVisibility();
    };
    const resizeObserver = new ResizeObserver(queueSample);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio > .05;
      if (!visible) firstFormation = true;
      if (visible && firstFormation && particles.length && motionEnabled()) {
        startGather(true); firstFormation = false;
      }
      syncVisibility();
    }, { threshold: [0, .05] });
    resizeObserver.observe(container);
    intersectionObserver.observe(container);
    motionQuery.addEventListener('change', syncMotion);
    document.addEventListener('visibilitychange', syncVisibility);
    window.addEventListener('scroll', ensureRenderLoop, { passive: true });
    window.addEventListener('pageshow', resumeAfterNavigation);
    window.addEventListener('pagehide', stopLoop);
    canvas.addEventListener('pointerenter', handlePointerEnter, { passive: true });
    canvas.addEventListener('pointermove', handlePointerMove, { passive: true });
    canvas.addEventListener('pointerleave', handlePointerLeave);
    canvas.addEventListener('click', handleClick);
    sampleImage();
    return () => {
      alive = false;
      buildId += 1;
      stopLoop();
      if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      motionQuery.removeEventListener('change', syncMotion);
      document.removeEventListener('visibilitychange', syncVisibility);
      window.removeEventListener('scroll', ensureRenderLoop);
      window.removeEventListener('pageshow', resumeAfterNavigation);
      window.removeEventListener('pagehide', stopLoop);
      canvas.removeEventListener('pointerenter', handlePointerEnter);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerleave', handlePointerLeave);
      canvas.removeEventListener('click', handleClick);
      replayRef.current = null;
      syncRef.current = null;
    };
  }, [src, particleSize, density, color, highlightColor, scatter, gatherDuration, stagger,
    pointerRepel, repelRadius, idleDrift, trigger, fit, glow]);

  useEffect(() => { pausedRef.current = paused; syncRef.current?.(); }, [paused]);
  useEffect(() => { departingRef.current = departing; syncRef.current?.(); }, [departing]);
  useEffect(() => { if (replayToken > 0) replayRef.current?.(); }, [replayToken]);

  return <div ref={containerRef} className={`particle-silhouette ${className}`} data-ready={ready} role="img" aria-label={alt}>
    <img className="particle-silhouette__fallback" src={src} alt="" decoding="async" />
    <canvas ref={canvasRef} className="particle-silhouette__canvas" aria-hidden="true" />
  </div>;
};

export default ParticleSilhouette;
