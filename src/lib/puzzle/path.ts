import type { EdgeSign, Edges } from "./types";

export function makePiecePath(
  x: number,
  y: number,
  w: number,
  h: number,
  edges: Edges,
  tab: number,
): Path2D {
  const path = new Path2D();
  path.moveTo(x, y);
  drawSide(path, x, y, x + w, y, edges.top, tab);
  drawSide(path, x + w, y, x + w, y + h, edges.right, tab);
  drawSide(path, x + w, y + h, x, y + h, edges.bottom, tab);
  drawSide(path, x, y + h, x, y, edges.left, tab);
  path.closePath();
  return path;
}

function drawSide(
  path: Path2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  sign: EdgeSign,
  tab: number,
) {
  if (sign === 0) {
    path.lineTo(x1, y1);
    return;
  }

  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  const px = uy;
  const py = -ux;
  const s = sign;
  const mid = len / 2;
  const n = Math.min(tab * 0.5, len * 0.18);
  const d = tab * 0.96;

  const pt = (along: number, out: number) => ({
    x: x0 + ux * along + px * s * out,
    y: y0 + uy * along + py * s * out,
  });

  const neckIn = pt(mid - n * 1.72, 0);
  path.lineTo(neckIn.x, neckIn.y);

  const c1 = pt(mid - n * 0.85, d * 0.04);
  const c2 = pt(mid - n * 2.4, d);
  const apex = pt(mid, d);
  path.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, apex.x, apex.y);

  const c3 = pt(mid + n * 2.4, d);
  const c4 = pt(mid + n * 0.85, d * 0.04);
  const neckOut = pt(mid + n * 1.72, 0);
  path.bezierCurveTo(c3.x, c3.y, c4.x, c4.y, neckOut.x, neckOut.y);

  path.lineTo(x1, y1);
}
