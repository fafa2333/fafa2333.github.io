// Port of scripts/render-hero-gears.py: the original 30/20-tooth involute
// profiles, spoke windows, oblique projection and 8-second video rotation.
export const TAU = Math.PI * 2;
export const MODULE = 12;
export const NORMAL_SPEED = Math.PI / 24;
export const INTRO_BEARING = Math.PI / 6;
export const GEARS = [
  { teeth: 30, spokes: 6, x: 150, phase: 0, speed: 1 },
  { teeth: 20, spokes: 4, x: -150, phase: Math.PI / 20, speed: -1.5 },
];
export const polar = (radius, angle) => [radius * Math.cos(angle), radius * Math.sin(angle)];
export function involute(radius, base) {
  const angle = Math.acos(Math.min(1, base / radius));
  return Math.tan(angle) - angle;
}
export function toothOutline(teeth) {
  const pitch = MODULE * teeth / 2, base = pitch * Math.cos(Math.PI / 9);
  const root = pitch - 1.25 * MODULE, tip = pitch + MODULE;
  const half = Math.PI / (2 * teeth), pitchInv = involute(pitch, base), baseHalf = half + pitchInv;
  const tipHalf = half + pitchInv - involute(tip, base), points = [];
  for (let tooth = 0; tooth < teeth; tooth++) {
    const angle = tooth * TAU / teeth;
    points.push(polar(root, angle - baseHalf));
    for (let step = 0; step <= 8; step++) {
      const radius = base + (tip - base) * step / 8;
      points.push(polar(radius, angle - half - pitchInv + involute(radius, base)));
    }
    for (let step = 1; step <= 4; step++) points.push(polar(tip, angle - tipHalf + 2 * tipHalf * step / 4));
    for (let step = 1; step <= 8; step++) {
      const radius = tip - (tip - base) * step / 8;
      points.push(polar(radius, angle + half + pitchInv - involute(radius, base)));
    }
    points.push(polar(root, angle + baseHalf));
    const nextStart = angle + TAU / teeth - baseHalf;
    for (let step = 1; step <= 4; step++) points.push(polar(root, angle + baseHalf + (nextStart - angle - baseHalf) * step / 4));
  }
  return points;
}
export function circlePoints(radius) {
  return Array.from({ length: 192 }, (_, step) => polar(radius, TAU * step / 192));
}
export function windowPoints(pitch, spokes, spoke) {
  const start = spoke * TAU / spokes + .18, end = (spoke + 1) * TAU / spokes - .18;
  return [...Array.from({ length: 25 }, (_, n) => polar(pitch * .68, start + (end - start) * n / 24)),
    ...Array.from({ length: 25 }, (_, n) => polar(pitch * .35, end - (end - start) * n / 24))];
}
export function draftingGuides(pitch) {
  const extent = pitch + 28;
  const lines = [
    [[-extent, 0], [extent, 0]], [[0, -extent], [0, extent]],
    [[-pitch, -extent], [pitch, -extent]],
    [[-pitch, -pitch + 14], [-pitch, -pitch - 38]], [[pitch, -pitch + 14], [pitch, -pitch - 38]],
    [[-pitch + 8, -extent - 4], [-pitch, -extent], [-pitch + 8, -extent + 4]],
    [[pitch - 8, -extent - 4], [pitch, -extent], [pitch - 8, -extent + 4]],
  ];
  return [...lines.map((points, n) => ({ points, closed: false, delay: n < 2 ? 0 : .18 })),
    { points: circlePoints(pitch), closed: true, delay: .12 }];
}
export function gearLayout(width, height, mobile, viewportHeight = height, canvasTop = 0) {
  const introHeight = Math.min(height, viewportHeight);
  const cos = Math.cos(INTRO_BEARING), sin = Math.sin(INTRO_BEARING);
  // Center the gear silhouettes, then fit their drafting lines around that
  // center. A diameter witness line can extend farther than the tooth tips.
  const bounds = {
    left: Math.min(...GEARS.map(g => g.x * cos - (MODULE * g.teeth / 2 + MODULE))),
    right: Math.max(...GEARS.map(g => g.x * cos + (MODULE * g.teeth / 2 + MODULE))),
    top: Math.min(...GEARS.map(g => g.x * sin - (MODULE * g.teeth / 2 + MODULE))),
    bottom: Math.max(...GEARS.map(g => g.x * sin + (MODULE * g.teeth / 2 + MODULE))),
  };
  const cx = (bounds.left + bounds.right) / 2, cy = (bounds.top + bounds.bottom) / 2;
  const envelope = GEARS.flatMap(g => {
    const pitch = MODULE * g.teeth / 2;
    return [...circlePoints(pitch + MODULE), ...draftingGuides(pitch).flatMap(guide => guide.points)]
      .map(([x, y]) => [(x + g.x) * cos - y * sin, (x + g.x) * sin + y * cos]);
  });
  const envelopeWidth = 2 * Math.max(...envelope.map(([x]) => Math.abs(x - cx)));
  const envelopeHeight = 2 * Math.max(...envelope.map(([, y]) => Math.abs(y - cy)));
  const introScale = Math.min(width * (mobile ? .86 : .76) / envelopeWidth, introHeight * .62 / envelopeHeight);
  // Match the old 1440x900 video: cover, 67% object-position on phones.
  const scale = Math.max(width / 1440, height / 900);
  const left = (width - 1440 * scale) * (mobile ? .67 : .5);
  const top = (height - 900 * scale) * .5;
  return {
    final: { x: left + 1033 * scale, y: top + 397.5 * scale, scale },
    // Re-compose the front view for phones instead of cropping desktop coords.
    initial: { x: width * .5 - cx * introScale,
      y: introHeight * .5 - canvasTop - cy * introScale,
      scale: introScale },
  };
}
export function interpolatePose(layout, mix) {
  const lerp = (a, b) => a + (b - a) * mix;
  return { x: lerp(layout.initial.x, layout.final.x), y: lerp(layout.initial.y, layout.final.y),
    scale: lerp(layout.initial.scale, layout.final.scale),
    a: lerp(Math.cos(INTRO_BEARING), .88), b: lerp(Math.sin(INTRO_BEARING), .35),
    c: lerp(-Math.sin(INTRO_BEARING), -.32), d: lerp(Math.cos(INTRO_BEARING), .74),
    depthX: 10 * mix, depthY: -28 * mix };
}
