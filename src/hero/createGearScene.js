import { GEARS, MODULE, TAU, NORMAL_SPEED, polar, involute, toothOutline, circlePoints, windowPoints, draftingGuides, gearLayout, interpolatePose } from './gearGeometry.js';

function path(points, closed = true) {
  const drawing = new Path2D();
  drawing.moveTo(...points[0]);
  let length = 0;
  points.forEach((point, i) => {
    if (i) drawing.lineTo(...point);
    const previous = points[(i + points.length - 1) % points.length];
    if (i || closed) length += Math.hypot(point[0] - previous[0], point[1] - previous[1]);
  });
  if (closed) drawing.closePath();
  return { drawing, length };
}

export function createGearScene(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx || typeof Path2D === 'undefined') throw new Error('Canvas line drawing unavailable');
  // Immutable geometry is cached once; only matrices/angle change each frame.
  const gears = GEARS.map(gear => {
    const pitch = MODULE * gear.teeth / 2, base = pitch * Math.cos(Math.PI / 9);
    const tipHalf = Math.PI / (2 * gear.teeth) + involute(pitch, base) - involute(pitch + MODULE, base);
    return { ...gear, pitch, outline: path(toothOutline(gear.teeth)),
      circles: [.74, .16, .76, .28, .16].map(r => path(circlePoints(pitch * r))),
      windows: Array.from({ length: gear.spokes }, (_, n) => path(windowPoints(pitch, gear.spokes, n))),
      guides: draftingGuides(pitch).map(guide => ({ ...path(guide.points, guide.closed), delay: guide.delay })),
      edges: Array.from({ length: gear.teeth }, (_, n) => [-tipHalf, tipHalf].map(offset => polar(pitch + MODULE, n * TAU / gear.teeth + offset))).flat() };
  });
  const state = { draw: 1, smallDraw: 1, mix: 1, speed: 1, guide: 0, guideDraw: 1, guideErase: 1, wash: 1 };
  let turn = 0, width = 0, height = 0, dpr = 1, layout;
  function resize() {
    // ResizeObserver is the only layout measurement; no reads in the ticker.
    width = canvas.clientWidth; height = canvas.clientHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    layout = gearLayout(width, height, window.matchMedia('(max-width: 760px)').matches,
      window.innerHeight || height, canvas.getBoundingClientRect().top);
    render();
  }
  function stroke(cached, opacity, lineWidth, progress) {
    if (progress <= 0) return;
    ctx.strokeStyle = '#656b60'; ctx.globalAlpha = opacity; ctx.lineWidth = lineWidth;
    ctx.lineDashOffset = 0;
    ctx.setLineDash(progress < .999 ? [cached.length * progress, cached.length * 2] : []);
    ctx.stroke(cached.drawing);
  }
  function render() {
    if (!layout || !width || !height) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const pose = interpolatePose(layout, state.mix);
    ctx.translate(pose.x, pose.y); ctx.scale(pose.scale, pose.scale);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    gears.forEach((gear, i) => {
      const progress = i ? state.smallDraw : state.draw;
      const angle = gear.phase + turn * gear.speed;
      ctx.save();
      ctx.transform(pose.a, pose.b, pose.c, pose.d, pose.a * gear.x, pose.b * gear.x);
      if (state.guide > 0) {
        ctx.globalAlpha = state.guide * .28; ctx.strokeStyle = '#656b60'; ctx.lineWidth = .7;
        gear.guides.forEach(guide => {
          const end = Math.max(0, (state.guideDraw - guide.delay) / (1 - guide.delay));
          const start = state.guideErase;
          if (end <= start) return;
          ctx.setLineDash([guide.length * (end - start), guide.length * 2]);
          ctx.lineDashOffset = -guide.length * start;
          ctx.stroke(guide.drawing);
        });
      }
      ctx.restore();
      function face(rear) {
        ctx.save();
        ctx.translate(rear ? pose.depthX : 0, rear ? pose.depthY : 0);
        ctx.transform(pose.a, pose.b, pose.c, pose.d, pose.a * gear.x, pose.b * gear.x);
        ctx.rotate(angle);
        stroke(gear.outline, rear ? .35 * state.mix : .9, rear ? .95 : 1.65, progress);
        if (rear) {
          stroke(gear.circles[0], .19 * state.mix, .8, progress);
          stroke(gear.circles[1], .3 * state.mix, .85, progress);
        } else {
          [.74, .78, .86].forEach((opacity, n) => stroke(gear.circles[n + 2], opacity, 1.45, Math.max(0, (progress - .18) / .82)));
          gear.windows.forEach(window => stroke(window, .74, 1.25, Math.max(0, (progress - .28) / .72)));
        }
        ctx.restore();
      }
      face(true);
      if (state.mix && progress) {
        ctx.save(); ctx.globalAlpha = .4 * state.mix; ctx.strokeStyle = '#656b60'; ctx.lineWidth = .95; ctx.setLineDash([]);
        ctx.beginPath();
        gear.edges.slice(0, Math.ceil(gear.edges.length * progress)).forEach(([x, y]) => {
          const rotatedX = x * Math.cos(angle) - y * Math.sin(angle) + gear.x;
          const rotatedY = x * Math.sin(angle) + y * Math.cos(angle);
          const px = pose.a * rotatedX + pose.c * rotatedY, py = pose.b * rotatedX + pose.d * rotatedY;
          ctx.moveTo(px + pose.depthX, py + pose.depthY); ctx.lineTo(px, py);
        });
        ctx.stroke(); ctx.restore();
      }
      face(false);
    });
    ctx.globalAlpha = 1; ctx.setLineDash([]);
  }
  return { state, resize, render,
    advance: seconds => { turn += seconds * NORMAL_SPEED * state.speed; },
    // Diagnostics are updated only at lifecycle boundaries, never each frame.
    angle: () => turn,
  };
}
