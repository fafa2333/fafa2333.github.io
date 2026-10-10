function dot(p, v) { return p[0] * v[0] + p[1] * v[1] + p[2] * v[2]; }

export function cameraBasis(direction) {
  const length = Math.hypot(...direction), forward = direction.map(v => v / length);
  const horizontal = Math.hypot(forward[0], forward[2]);
  const right = [forward[2] / horizontal, 0, -forward[0] / horizontal];
  const up = [-forward[1] * forward[0] / horizontal, horizontal, -forward[1] * forward[2] / horizontal];
  return { forward, right, up };
}

function projectedBounds(local, scale, shiftX, shiftY, settings) {
  const tangent = Math.tan(settings.fov * Math.PI / 360);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  let minDX, maxDX, minDY, maxDY;
  for (let i = 0; i < local.length; i += 3) {
    const distance = settings.distance - local[i + 2] * scale;
    const dx = 1 / (distance * tangent * settings.aspect), dy = 1 / (distance * tangent);
    const x = (local[i] * scale + shiftX) * dx, y = (local[i + 1] * scale + shiftY) * dy;
    if (x < minX) { minX = x; minDX = dx; }
    if (x > maxX) { maxX = x; maxDX = dx; }
    if (y < minY) { minY = y; minDY = dy; }
    if (y > maxY) { maxY = y; maxDY = dy; }
  }
  return { minX, maxX, minY, maxY, width: (maxX - minX) / 2, height: (maxY - minY) / 2,
    centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2,
    derivativeX: (minDX + maxDX) / 2, derivativeY: (minDY + maxDY) / 2 };
}

// Bounding-box centering first; perspective screen centering second. The
// projected bounds use actual returns, not empty corners of the 3D box.
export function calculateNormalization(positions, settings) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) for (let axis = 0; axis < 3; axis++) {
    min[axis] = Math.min(min[axis], positions[i + axis]);
    max[axis] = Math.max(max[axis], positions[i + axis]);
  }
  const center = min.map((v, axis) => (v + max[axis]) / 2);
  const basis = cameraBasis(settings.direction), local = new Float64Array(positions.length);
  for (let i = 0; i < positions.length; i += 3) {
    const p = center.map((v, axis) => positions[i + axis] - v);
    local[i] = dot(p, basis.right); local[i + 1] = dot(p, basis.up); local[i + 2] = dot(p, basis.forward);
  }
  function fit(scale) {
    let x = 0, y = 0, projected;
    for (let iteration = 0; iteration < 12; iteration++) {
      projected = projectedBounds(local, scale, x, y, settings);
      if (Math.max(Math.abs(projected.centerX), Math.abs(projected.centerY)) < 1e-9) break;
      x -= projected.centerX / projected.derivativeX; y -= projected.centerY / projected.derivativeY;
    }
    projected = projectedBounds(local, scale, x, y, settings);
    return { x, y, projected, coverage: Math.max(projected.width, projected.height) };
  }
  const radius = Math.hypot(...min.map((v, axis) => max[axis] - v)) / 2;
  if (!Number.isFinite(radius) || radius <= 0) throw new Error('模型包围盒无效');
  let low = 0, high = settings.distance * .85 / radius;
  for (let iteration = 0; iteration < 28; iteration++) {
    const scale = (low + high) / 2;
    if (fit(scale).coverage < settings.targetCoverage) low = scale; else high = scale;
  }
  const baseScale = (low + high) / 2, scale = baseScale * settings.scaleMultiplier;
  const fitted = fit(scale);
  const offset = basis.right.map((v, axis) => v * fitted.x + basis.up[axis] * fitted.y);
  return { scale, baseScale, center, offset, sourceBounds: { min, max }, projected: fitted.projected,
    coverage: fitted.coverage, scaleMultiplier: settings.scaleMultiplier };
}

export function normalizePosition(p, normalization) {
  return p.map((v, axis) => (v - normalization.center[axis]) * normalization.scale + normalization.offset[axis]);
}
