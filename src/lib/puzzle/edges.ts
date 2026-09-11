import type { EdgeSign, Edges } from "./types";

function coin(): EdgeSign {
  return Math.random() < 0.5 ? 1 : -1;
}

function invert(sign: EdgeSign): EdgeSign {
  if (sign === 1) return -1;
  if (sign === -1) return 1;
  return 0;
}

export function generateEdges(rows: number, cols: number): Edges[] {
  const pieces: Edges[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const left: EdgeSign =
        c === 0 ? 0 : invert(pieces[r * cols + (c - 1)]!.right);
      const top: EdgeSign =
        r === 0 ? 0 : invert(pieces[(r - 1) * cols + c]!.bottom);
      const right: EdgeSign = c === cols - 1 ? 0 : coin();
      const bottom: EdgeSign = r === rows - 1 ? 0 : coin();
      pieces.push({ top, right, bottom, left });
    }
  }

  return pieces;
}
