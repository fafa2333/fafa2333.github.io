import { useEffect, useRef } from 'react';

// A small, demand-rendered spring field for decorative dots. Pointer events are
// received by the section, so model labels and other overlays cannot block it.
export default function CursorDotField({ className, scale = 1 }) {
  const canvas = useRef(null);
  useEffect(() => {
    const element = canvas.current, context = element.getContext('2d');
    if (!context) return;
    const surface = element.closest('section');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const radius = 2.4 * scale, spacing = 15 * scale, influence = 62 * scale;
    let width = 0, height = 0, points = [], frame = 0, previousTime = 0;
    let visible = false, pointer = null;
    const draw = () => {
      context.clearRect(0, 0, width, height);
      context.fillStyle = '#9aa38d';
      context.beginPath();
      for (const point of points) {
        context.moveTo(point.x + radius, point.y);
        context.arc(point.x, point.y, radius, 0, Math.PI * 2);
      }
      context.fill();
    };
    const stop = () => { cancelAnimationFrame(frame); frame = 0; previousTime = 0; };
    const reset = () => {
      stop(); pointer = null;
      for (const point of points) { point.x = point.homeX; point.y = point.homeY; point.vx = point.vy = 0; }
      element.dataset.motion = 'idle'; draw();
    };
    const tick = time => {
      frame = 0;
      const dt = previousTime ? Math.min((time - previousTime) / 1000, .032) : 1 / 60;
      previousTime = time;
      let unsettled = false;
      for (const point of points) {
        let targetX = point.homeX, targetY = point.homeY;
        if (pointer) {
          const dx = point.homeX - pointer.x, dy = point.homeY - pointer.y;
          const distance = Math.hypot(dx, dy);
          if (distance < influence) {
            const strength = Math.pow(1 - distance / influence, 2) * 12 * scale;
            const divisor = Math.max(distance, 1);
            targetX += (dx - dy * .08) / divisor * strength;
            targetY += (dy + dx * .08) / divisor * strength;
          }
        }
        // A restrained version of the silhouette's repulsion, swirl and spring
        // return; the original grid and its directional fade remain unchanged.
        point.vx += ((targetX - point.x) * 90 - point.vx * 17) * dt;
        point.vy += ((targetY - point.y) * 90 - point.vy * 17) * dt;
        point.x += point.vx * dt; point.y += point.vy * dt;
        if (Math.hypot(targetX - point.x, targetY - point.y) > .025 || Math.hypot(point.vx, point.vy) > .025) unsettled = true;
        else { point.x = targetX; point.y = targetY; point.vx = point.vy = 0; }
      }
      draw();
      if (unsettled) frame = requestAnimationFrame(tick);
      else { previousTime = 0; element.dataset.motion = 'idle'; }
    };
    const wake = () => {
      if (frame || !visible || document.hidden || reducedMotion.matches) return;
      element.dataset.motion = 'active'; frame = requestAnimationFrame(tick);
    };
    const resize = () => {
      const bounds = element.getBoundingClientRect();
      width = bounds.width; height = bounds.height;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      element.width = Math.max(1, Math.round(width * ratio));
      element.height = Math.max(1, Math.round(height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      points = [];
      for (let y = spacing / 2; y < height; y += spacing) for (let x = spacing / 2; x < width; x += spacing) {
        points.push({ homeX: x, homeY: y, x, y, vx: 0, vy: 0 });
      }
      reset();
    };
    const move = event => {
      if (event.pointerType !== 'mouse' || reducedMotion.matches || !visible || document.hidden) return;
      const bounds = element.getBoundingClientRect();
      const x = event.clientX - bounds.left, y = event.clientY - bounds.top;
      const nearby = x > -influence && y > -influence && x < width + influence && y < height + influence;
      if (!nearby && !pointer) return;
      pointer = nearby ? { x, y } : null; wake();
    };
    const leave = () => { if (pointer) { pointer = null; wake(); } };
    const suspend = () => { if (document.hidden || reducedMotion.matches) reset(); };
    const sizeObserver = new ResizeObserver(resize); sizeObserver.observe(element);
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting; if (!visible) reset();
    });
    visibilityObserver.observe(element);
    surface.addEventListener('pointermove', move, { passive: true });
    surface.addEventListener('pointerleave', leave, { passive: true });
    document.addEventListener('visibilitychange', suspend);
    reducedMotion.addEventListener('change', suspend);
    resize();
    return () => {
      stop(); sizeObserver.disconnect(); visibilityObserver.disconnect();
      surface.removeEventListener('pointermove', move); surface.removeEventListener('pointerleave', leave);
      document.removeEventListener('visibilitychange', suspend); reducedMotion.removeEventListener('change', suspend);
    };
  }, [scale]);
  return <canvas ref={canvas} className={className} aria-hidden="true" />;
}
