// One continuous scatter/reassembly curve. Both ends settle at zero velocity;
// the carry term preserves the current velocity when a switch is interrupted.
export const PARTICLE_MORPH_DURATION = 1050;

export const morphWeights = progress => {
  const t = Math.min(1, Math.max(0, progress));
  const remaining = 1 - t;
  return {
    blend: t * t * t * (10 + t * (-15 + t * 6)),
    cloud: 16 * t * t * remaining * remaining,
    carry: t * remaining * remaining,
    direction: t,
  };
};
