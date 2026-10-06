// Shared coordinates for the hero's cursor cells and its static intro texture.
export const HERO_GRID = Object.freeze({ cellSize: 112, color: '#747a6e', lineWidth: .8, maxOpacity: .26 });

export function gridLattice(width, height, cellSize) {
  const cols = Math.ceil(width / cellSize) + 1;
  const rows = Math.ceil(height / cellSize) + 1;
  return { cols, rows, offX: (width - cols * cellSize) / 2, offY: (height - rows * cellSize) / 2 };
}

export function gridCellBox(lattice, col, row, cellSize) {
  return { x: lattice.offX + col * cellSize + .5, y: lattice.offY + row * cellSize + .5, size: cellSize - 1 };
}
