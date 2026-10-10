import { cameraBasis } from '../pointcloud-test/normalization.js';

export const EDUCATION_FRAMING = Object.freeze({
  bit: { scaleGain: 1.12, maxCoverage: .98 },
  hive: { scaleGain: 1.06, maxCoverage: .97 },
  angleSteps: 72,
  sampleCount: 6000,
});

// Fit a full turn to one stationary anchor. Rotation must never translate the
// building; the sampled views only determine scale and the initial placement.
export function framingSamples(positions, center) {
  const count = Math.min(positions.length / 3, EDUCATION_FRAMING.sampleCount);
  const points = new Float64Array(count * 3);
  for (let i = 0; i < count; i++) {
    const index = Math.floor(i * (positions.length / 3 - 1) / Math.max(1, count - 1)) * 3;
    for (let axis = 0; axis < 3; axis++) points[i * 3 + axis] = positions[index + axis] - center[axis];
  }
  return points;
}

function fitPose(points, scale, yaw, settings, basis, fixedOffset) {
  const c = Math.cos(yaw), s = Math.sin(yaw), tangent = Math.tan(settings.fov * Math.PI / 360);
  const projected = new Float64Array(points.length + points.length / 3);
  for (let i = 0, j = 0; i < points.length; i += 3, j += 4) {
    const x = (points[i] * c + points[i + 2] * s) * scale;
    const y = points[i + 1] * scale, z = (-points[i] * s + points[i + 2] * c) * scale;
    const depth = settings.distance - (x * basis.forward[0] + y * basis.forward[1] + z * basis.forward[2]);
    projected[j] = x * basis.right[0] + y * basis.right[1] + z * basis.right[2];
    projected[j + 1] = x * basis.up[0] + y * basis.up[1] + z * basis.up[2];
    projected[j + 2] = 1 / (depth * tangent * settings.aspect);
    projected[j + 3] = 1 / (depth * tangent);
  }
  let shiftX = fixedOffset ? fixedOffset.reduce((sum, v, axis) => sum + v * basis.right[axis], 0) : 0;
  let shiftY = fixedOffset ? fixedOffset.reduce((sum, v, axis) => sum + v * basis.up[axis], 0) : 0;
  let coverage, centerX, centerY;
  for (let pass = 0; pass < (fixedOffset ? 1 : 6); pass++) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    let dxMin, dxMax, dyMin, dyMax;
    for (let j = 0; j < projected.length; j += 4) {
      const dx = projected[j + 2], dy = projected[j + 3];
      const x = (projected[j] + shiftX) * dx, y = (projected[j + 1] + shiftY) * dy;
      if (x < minX) { minX = x; dxMin = dx; } if (x > maxX) { maxX = x; dxMax = dx; }
      if (y < minY) { minY = y; dyMin = dy; } if (y > maxY) { maxY = y; dyMax = dy; }
    }
    coverage = fixedOffset ? Math.max(Math.abs(minX), Math.abs(maxX), Math.abs(minY), Math.abs(maxY))
      : Math.max((maxX - minX) / 2, (maxY - minY) / 2);
    centerX = (minX + maxX) / 2; centerY = (minY + maxY) / 2;
    if (!fixedOffset) {
      shiftX -= (minX + maxX) / (dxMin + dxMax);
      shiftY -= (minY + maxY) / (dyMin + dyMax);
    }
  }
  return { offset: basis.right.map((v, axis) => v * shiftX + basis.up[axis] * shiftY), coverage, centerX, centerY };
}

export function buildEducationFraming(points, normalization, settings, model) {
  const config = EDUCATION_FRAMING[model], basis = cameraBasis(settings.direction);
  let scale = normalization.scale * config.scaleGain, poses, coverage, offset;
  for (let pass = 0; pass < 4; pass++) {
    poses = Array.from({ length: EDUCATION_FRAMING.angleSteps }, (_, index) =>
      fitPose(points, scale, index * Math.PI * 2 / EDUCATION_FRAMING.angleSteps, settings, basis));
    offset = [0, 1, 2].map(axis => poses.reduce((sum, pose) => sum + pose.offset[axis], 0) / poses.length);
    const fixedViews = poses.map((_, index) => fitPose(points, scale,
      index * Math.PI * 2 / EDUCATION_FRAMING.angleSteps, settings, basis, offset));
    const centerX = (Math.min(...fixedViews.map(view => view.centerX)) + Math.max(...fixedViews.map(view => view.centerX))) / 2;
    const centerY = (Math.min(...fixedViews.map(view => view.centerY)) + Math.max(...fixedViews.map(view => view.centerY))) / 2;
    const tangent = Math.tan(settings.fov * Math.PI / 360);
    offset = offset.map((v, axis) => v - basis.right[axis] * centerX * settings.distance * tangent * settings.aspect
      - basis.up[axis] * centerY * settings.distance * tangent);
    coverage = Math.max(...poses.map((_, index) => fitPose(points, scale,
      index * Math.PI * 2 / EDUCATION_FRAMING.angleSteps, settings, basis, offset).coverage));
    if (coverage <= config.maxCoverage + 1e-5) break;
    scale *= config.maxCoverage / coverage;
  }
  return { scale, offset, coverage };
}

export function framingOffset(framing) { return framing.offset; }
