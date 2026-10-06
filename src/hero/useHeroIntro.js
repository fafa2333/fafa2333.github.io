import { useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { createGearScene } from './createGearScene.js';
import { createIntroGrid } from './createIntroGrid.js';
import { lockIntroScroll, resourceGate } from './introLifecycle.js';

let playedInThisDocument = false;
const enterAtHome = () => !playedInThisDocument && (!location.hash || ['#profile', '#main'].includes(location.hash)) && window.scrollY < 60;

export default function useHeroIntro({ paused, visible }) {
  const section = useRef(null), canvas = useRef(null), controller = useRef(null);
  const [active, setActive] = useState(enterAtHome);
  const [fallback, setFallback] = useState(false);
  const activity = useRef({ paused, visible });
  activity.current = { paused, visible };
  useLayoutEffect(() => {
    const root = section.current, drawing = canvas.current, wash = root.querySelector('.hero-wash');
    const header = root.closest('.home-page').querySelector('.site-header');
    const gridCanvas = root.querySelector('.hero-intro-grid');
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    let scene;
    try { scene = createGearScene(drawing); } catch { setFallback(true); }
    const grid = scene && gridCanvas ? createIntroGrid(gridCanvas) : null;
    const motion = scene?.state || { draw: 1, smallDraw: 1, mix: 1, speed: 1, guide: 0, guideDraw: 1, guideErase: 1, wash: 1 };
    let disposed = false, finished = false, ticking = false, reveal, trigger, gate, observer;
    const initial = active, minimal = query.matches || !scene;
    const startedAt = performance.now();
    const unlock = initial ? lockIntroScroll(document) : () => {};
    const headerItems = [header.querySelector('.brand'), header.querySelector('nav'), header.querySelector('.menu-toggle')];
    const rows = [root.querySelector('.hero-overline'), root.querySelector('.hero-name-cn'), root.querySelector('h1'), root.querySelector('.hero-statement'), root.querySelector('.hero-email'), root.querySelector('.hero-scroll'), root.querySelector('.hero-intro p'), ...root.querySelector('.hero-video-caption').children];
    const text = [...headerItems, ...rows];
    const frame = (_, deltaMs) => {
      if (!scene) return;
      if (!activity.current.paused && activity.current.visible && !document.hidden) scene.advance(Math.min(deltaMs, 64) / 1000);
      scene.render();
    };
    const updateActivity = () => {
      const needed = Boolean(scene && !document.hidden && activity.current.visible && (!activity.current.paused || !finished));
      if (needed && !ticking) { gsap.ticker.add(frame); ticking = true; }
      if (!needed && ticking) { gsap.ticker.remove(frame); ticking = false; }
      drawing.dataset.renderState = needed ? 'running' : activity.current.paused ? 'paused' : 'offscreen';
      if (scene && !needed) { drawing.dataset.stoppedAngle = String(scene.angle()); scene.render(); }
    };
    function installScrollReveal() {
      if (query.matches || trigger) return;
      reveal = gsap.timeline({ paused: true });
      rows.forEach((el, i) => reveal.fromTo(el, { opacity: 0, x: i >= 6 ? 24 : -24 }, { opacity: 1, x: 0, duration: .5, ease: 'power3.out' }, i * .035));
      // Start at its completed state. Returning from a chapter replays just the
      // familiar text entrance, never the mechanical intro or the scroll lock.
      reveal.progress(1);
      // ScrollTrigger can emit onEnter while being created. Do not replay
      // the entrance just as the intro finishes; arm it only after leaving.
      let hasLeft = false;
      const enter = () => { if (hasLeft) reveal.restart(); hasLeft = false; };
      const leave = () => { hasLeft = true; reveal.pause(0); };
      trigger = ScrollTrigger.create({ trigger: root, start: 'top 72%', end: 'bottom top',
        onEnter: enter, onEnterBack: enter, onLeave: leave, onLeaveBack: leave });
      if (!trigger.isActive) leave();
      else reveal.progress(1);
    }
    function complete() {
      if (finished || disposed) return;
      finished = true; playedInThisDocument = true;
      gate?.dispose();
      if (gridCanvas) observer?.unobserve(gridCanvas);
      grid?.dispose();
      // Keep the accumulated angle. Only the group pose reaches its neutral
      // state; the exact same cached paths and ticker continue after handoff.
      Object.assign(motion, { draw: 1, smallDraw: 1, mix: 1, speed: 1, guide: 0, guideDraw: 1, guideErase: 1, wash: 1 });
      root.dataset.introState = 'hero';
      root.dataset.introDuration = initial ? ((performance.now() - startedAt) / 1000).toFixed(3) : '0';
      if (scene) drawing.dataset.handoffAngle = String(scene.angle());
      gsap.set(text, { clearProps: 'opacity,transform' });
      wash.style.removeProperty('opacity');
      root.classList.remove('hero--intro');
      setActive(false); unlock(); updateActivity(); installScrollReveal();
    }
    const context = gsap.context(() => {}, root);
    let timeline;
    context.add(() => {
      if (!initial) { complete(); return; }
      root.dataset.introState = 'loading';
      gsap.set(text, { opacity: 0 });
      if (minimal) {
        Object.assign(motion, { draw: 1, smallDraw: 1, mix: 1, speed: 1, guide: 0, guideDraw: 1, guideErase: 1, wash: 1 });
        timeline = gsap.timeline({ onComplete: complete }).to(text, { opacity: 1, duration: .4, ease: 'power1.out' });
        if (gridCanvas) timeline.to(gridCanvas, { opacity: 0, duration: .4 }, 0);
      } else {
        Object.assign(motion, { draw: 0, smallDraw: 0, mix: 0, speed: 0, guide: 1, guideDraw: 0, guideErase: 0, wash: 0 });
        wash.style.opacity = '0';
        timeline = gsap.timeline({ onComplete: complete, onUpdate: () => { wash.style.opacity = String(motion.wash); } });
        timeline.call(() => { root.dataset.introState = 'drawing'; }, [], .08)
          .to(motion, { guideDraw: 1, duration: .7, ease: 'power1.inOut' }, .02)
          .to(motion, { draw: 1, duration: 1.41, ease: 'power1.inOut' }, .16)
          .to(motion, { smallDraw: 1, duration: 1.39, ease: 'power1.inOut' }, .22)
          .call(() => { root.dataset.introState = 'erasing'; }, [], 1.62)
          .to(motion, { guideErase: 1, guide: 0, duration: .25, ease: 'power1.inOut' }, 1.62)
          .to(motion, { speed: 1, duration: .35, ease: 'power2.inOut' }, 1.7);
        if (gridCanvas) timeline.to(gridCanvas, { opacity: 0, duration: .25, ease: 'power1.inOut' }, 1.62);
        // Geometry is synchronous; the sole network-dependent hero resource is
        // its font. Wait here only if necessary; reject/timeout uses fallback.
        gate = resourceGate(document.fonts?.load('10px "IBM Plex Mono"') || Promise.resolve(),
          (seconds, resolve) => { const deadline = gsap.delayedCall(seconds, resolve); return () => deadline.kill(); },
          () => { if (!disposed && !finished && timeline.paused()) timeline.play(); });
        timeline.addPause(1.85, () => { if (gate.ready()) timeline.play(); })
          .call(() => { root.dataset.introState = 'transition'; }, [], 1.86)
          .to(motion, { mix: 1, wash: 1, duration: .75, ease: 'power3.inOut' }, 1.87);
        headerItems.forEach((el, i) => timeline.fromTo(el, { x: i ? 0 : -24, y: i ? -10 : 0, opacity: 0 }, { x: 0, y: 0, opacity: 1, duration: .38, ease: 'power3.out' }, i ? 2.05 : 2));
        const at = [2.15, 2.23, 2.3, 2.4, 2.5, 2.55, 2.63, 2.63];
        rows.forEach((el, i) => timeline.fromTo(el, { x: i >= 6 ? 26 : -28, opacity: 0 }, { x: 0, opacity: 1, duration: .37, ease: 'power3.out' }, at[i]));
      }
    });
    const resize = () => { scene?.resize(); grid?.resize(); };
    resize(); updateActivity();
    observer = new ResizeObserver(resize); observer.observe(drawing);
    if (gridCanvas) observer.observe(gridCanvas);
    const navigate = event => {
      const link = event.target.closest('a[href], .menu-toggle');
      if (!finished && link && (link.matches('.menu-toggle') || link.getAttribute('href')?.startsWith('#'))) {
        timeline?.progress(1); complete();
      }
    };
    const changeMotion = () => { if (query.matches) { timeline?.progress(1); complete(); reveal?.progress(1); trigger?.kill(); trigger = null; } else if (finished) installScrollReveal(); };
    const pageShow = () => { updateActivity(); };
    document.addEventListener('click', navigate, true);
    document.addEventListener('visibilitychange', pageShow);
    query.addEventListener('change', changeMotion);
    controller.current = { updateActivity };
    return () => {
      disposed = true; gate?.dispose(); observer.disconnect();
      grid?.dispose();
      gsap.ticker.remove(frame); timeline?.kill(); reveal?.kill(); trigger?.kill(); context.revert();
      document.removeEventListener('click', navigate, true); document.removeEventListener('visibilitychange', pageShow);
      query.removeEventListener('change', changeMotion);
      wash.style.removeProperty('opacity'); unlock(); controller.current = null;
    };
  }, []);
  useLayoutEffect(() => { controller.current?.updateActivity(); }, [paused, visible]);
  return { section, canvas, active, fallback };
}
