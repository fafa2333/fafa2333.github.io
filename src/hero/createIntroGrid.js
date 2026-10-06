import { HERO_GRID, gridLattice, gridCellBox } from '../components/gridGeometry.js';

// Paint only on resize. GSAP fades the canvas as a background layer; it has
// no pointer listeners, cursor response or animation loop of its own.
export function createIntroGrid(canvas) {
  const ctx = canvas?.getContext('2d');
  if (!ctx) return null;
  let disposed = false;
  return { resize() {
    if (disposed) return;
    const width = canvas.offsetWidth, height = canvas.offsetHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const lattice = gridLattice(width, height, HERO_GRID.cellSize);
    ctx.strokeStyle = HERO_GRID.color; ctx.globalAlpha = .14; ctx.lineWidth = HERO_GRID.lineWidth;
    ctx.beginPath();
    for (let row = 0; row < lattice.rows; row++) {
      for (let col = 0; col < lattice.cols; col++) {
        const box = gridCellBox(lattice, col, row, HERO_GRID.cellSize);
        ctx.rect(box.x, box.y, box.size, box.size);
      }
    }
    ctx.stroke();
  }, dispose() { disposed = true; canvas.width = 0; canvas.height = 0; } };
}
