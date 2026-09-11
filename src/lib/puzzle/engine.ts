import { generateEdges } from "./edges";
import { makePiecePath } from "./path";
import { playComplete, playGroup, playPickup, playSnap, unlockAudio } from "./audio";
import { getBest, setBest } from "./storage";
import type { CompleteInfo, Edges, PuzzleStats } from "./types";

type Piece = {
  id: number;
  row: number;
  col: number;
  edges: Edges;
  group: number;
  placed: boolean;
  bx: number;
  by: number;
  z: number;
  el: HTMLCanvasElement;
  path: Path2D;
};

type Drag = {
  ids: number[];
  startX: number;
  startY: number;
  origin: Map<number, { bx: number; by: number }>;
  pointerId: number;
  moved: boolean;
};

export type EngineOptions = {
  container: HTMLElement;
  image: HTMLImageElement;
  cols: number;
  rows: number;
  imageId: string;
  imageTitle: string;
  onStats: (stats: PuzzleStats) => void;
  onComplete: (info: CompleteInfo) => void;
};

export class PuzzleEngine {
  private container: HTMLElement;
  private image: HTMLImageElement;
  private cols: number;
  private rows: number;
  private imageId: string;
  private imageTitle: string;
  private onStats: (stats: PuzzleStats) => void;
  private onComplete: (info: CompleteInfo) => void;

  private pieces: Piece[] = [];
  private boardEl: HTMLDivElement;
  private ghostEl: HTMLImageElement;
  private slotEl: HTMLDivElement;
  private hintEl: HTMLDivElement | null = null;

  private boardX = 0;
  private boardY = 0;
  private boardW = 1;
  private boardH = 1;
  private pieceW = 1;
  private pieceH = 1;
  private tab = 12;
  private pad = 16;
  private dpr = 1;
  private raster: HTMLCanvasElement | null = null;

  private drag: Drag | null = null;
  private zTop = 10;
  private timerStarted = false;
  private t0 = 0;
  private elapsedMs = 0;
  private complete = false;
  private snapPx = 28;
  private raf = 0;
  private destroyed = false;
  private reduced = false;

  private ro: ResizeObserver | null = null;
  private onPointerDown = (e: PointerEvent) => this.handleDown(e);
  private onPointerMove = (e: PointerEvent) => this.handleMove(e);
  private onPointerUp = (e: PointerEvent) => this.handleUp(e);
  private onLostCapture = (e: PointerEvent) => this.handleUp(e);
  private onKey = (e: KeyboardEvent) => this.handleKey(e);

  constructor(opts: EngineOptions) {
    this.container = opts.container;
    this.image = opts.image;
    this.cols = opts.cols;
    this.rows = opts.rows;
    this.imageId = opts.imageId;
    this.imageTitle = opts.imageTitle;
    this.onStats = opts.onStats;
    this.onComplete = opts.onComplete;
    this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    this.container.classList.add("puzzle-field");
    this.boardEl = document.createElement("div");
    this.boardEl.className = "puzzle-board";
    this.ghostEl = document.createElement("img");
    this.ghostEl.src = opts.image.src;
    this.ghostEl.alt = "";
    this.ghostEl.draggable = false;
    this.ghostEl.className = "puzzle-ghost";
    this.slotEl = document.createElement("div");
    this.slotEl.className = "puzzle-slot";
    this.boardEl.append(this.ghostEl, this.slotEl);
    this.container.appendChild(this.boardEl);

    this.layout();
    this.buildPieces();
    this.scatter(true);

    this.container.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("pointercancel", this.onPointerUp);
    window.addEventListener("keydown", this.onKey);

    this.ro = new ResizeObserver(() => this.handleResize());
    this.ro.observe(this.container);

    this.emitStats();
    this.loop();
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    this.ro?.disconnect();
    this.container.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    window.removeEventListener("pointercancel", this.onPointerUp);
    window.removeEventListener("keydown", this.onKey);
    for (const p of this.pieces) p.el.remove();
    this.boardEl.remove();
    this.hintEl?.remove();
    this.pieces = [];
  }

  hint() {
    if (this.complete) return;
    const unplaced = this.pieces.filter((p) => !p.placed);
    if (unplaced.length === 0) return;

    this.ghostEl.classList.add("is-hint");
    window.setTimeout(() => this.ghostEl.classList.remove("is-hint"), 1400);

    const p = unplaced[Math.floor(Math.random() * unplaced.length)]!;
    this.flashSlot(p.col, p.row);
  }

  setGhostVisible(on: boolean) {
    this.ghostEl.classList.toggle("is-preview", on);
  }

  private lastHud = 0;

  private loop = () => {
    if (this.destroyed) return;
    if (this.timerStarted && !this.complete) {
      this.elapsedMs = performance.now() - this.t0;
      const now = performance.now();
      if (now - this.lastHud > 80) {
        this.lastHud = now;
        this.emitStats();
      }
    }
    this.raf = requestAnimationFrame(this.loop);
  };

  private emitStats() {
    const placed = this.pieces.filter((p) => p.placed).length;
    this.onStats({
      placed,
      total: this.pieces.length,
      elapsedMs: this.elapsedMs,
      started: this.timerStarted,
      complete: this.complete,
    });
  }

  private layout() {
    const rect = this.container.getBoundingClientRect();
    const margin = rect.width < 640 ? 10 : 18;
    const availW = Math.max(120, rect.width - margin * 2);
    const availH = Math.max(120, rect.height - margin * 2);
    const aspect = this.image.naturalWidth / this.image.naturalHeight || 4 / 3;
    const fit = rect.width < 720 ? 0.84 : 0.62;

    let boardW = availW * fit;
    let boardH = boardW / aspect;
    if (boardH > availH * fit) {
      boardH = availH * fit;
      boardW = boardH * aspect;
    }

    this.boardW = boardW;
    this.boardH = boardH;
    this.boardX = (rect.width - boardW) / 2;
    this.boardY = (rect.height - boardH) / 2;
    this.pieceW = boardW / this.cols;
    this.pieceH = boardH / this.rows;
    this.tab = Math.min(this.pieceW, this.pieceH) * 0.22;
    this.pad = this.tab * 1.38;
    this.snapPx = Math.max(22, Math.min(this.pieceW, this.pieceH) * 0.32);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.boardEl.style.transform = `translate(${this.boardX}px, ${this.boardY}px)`;
    this.boardEl.style.width = `${this.boardW}px`;
    this.boardEl.style.height = `${this.boardH}px`;

    this.rasterize();
  }

  private rasterize() {
    const rw = Math.max(1, Math.round(this.boardW * this.dpr));
    const rh = Math.max(1, Math.round(this.boardH * this.dpr));
    const c = document.createElement("canvas");
    c.width = rw;
    c.height = rh;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(this.image, 0, 0, rw, rh);
    this.raster = c;
  }

  private buildPieces() {
    const edges = generateEdges(this.rows, this.cols);
    let id = 0;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const el = document.createElement("canvas");
        el.className = "puzzle-piece";
        el.dataset.row = String(r);
        el.dataset.col = String(c);
        el.dataset.piece = String(id);
        const piece: Piece = {
          id,
          row: r,
          col: c,
          edges: edges[id]!,
          group: id,
          placed: false,
          bx: c * this.pieceW,
          by: r * this.pieceH,
          z: 2,
          el,
          path: new Path2D(),
        };
        this.paintPiece(piece);
        this.container.appendChild(el);
        this.pieces.push(piece);
        id += 1;
      }
    }
  }

  private paintPiece(p: Piece) {
    const { pad, pieceW, pieceH, dpr, tab } = this;
    const cw = pieceW + pad * 2;
    const ch = pieceH + pad * 2;
    p.el.width = Math.max(1, Math.round(cw * dpr));
    p.el.height = Math.max(1, Math.round(ch * dpr));
    p.el.style.width = `${cw}px`;
    p.el.style.height = `${ch}px`;
    const ctx = p.el.getContext("2d");
    if (!ctx || !this.raster) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    const path = makePiecePath(pad, pad, pieceW, pieceH, p.edges, tab);
    p.path = path;

    ctx.save();
    ctx.clip(path);
    ctx.drawImage(
      this.raster,
      pad - p.col * pieceW,
      pad - p.row * pieceH,
      this.boardW,
      this.boardH,
    );
    ctx.restore();

    ctx.save();
    ctx.clip(path);
    ctx.strokeStyle = "rgba(28, 24, 20, 0.38)";
    ctx.lineWidth = 2.4;
    ctx.stroke(path);
    ctx.strokeStyle = "rgba(255, 250, 240, 0.32)";
    ctx.lineWidth = 1;
    ctx.translate(-0.5, -0.5);
    ctx.stroke(path);
    ctx.restore();

    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(210, 196, 172, 0.92)";
    ctx.lineWidth = 1.4;
    ctx.stroke(path);
  }

  private scatter(animate: boolean) {
    const rect = this.container.getBoundingClientRect();
    const pad = 8;
    const minX = pad - this.boardX;
    const minY = pad - this.boardY;
    const maxX = rect.width - pad - this.boardX - this.pieceW;
    const maxY = rect.height - pad - this.boardY - this.pieceH;
    const minDist = Math.min(this.pieceW, this.pieceH) * 1.15;

    for (const p of this.pieces) {
      p.placed = false;
      p.group = p.id;
      p.z = 2 + Math.floor(Math.random() * 8);
      let bx = 0;
      let by = 0;
      for (let i = 0; i < 24; i++) {
        bx = minX + Math.random() * Math.max(8, maxX - minX);
        by = minY + Math.random() * Math.max(8, maxY - minY);
        const dx = bx - p.col * this.pieceW;
        const dy = by - p.row * this.pieceH;
        if (Math.hypot(dx, dy) > minDist) break;
      }
      p.bx = bx;
      p.by = by;
    }

    if (animate && !this.reduced) {
      for (const p of this.pieces) {
        p.el.style.transition = "none";
        const saved = { bx: p.bx, by: p.by };
        p.bx = p.col * this.pieceW;
        p.by = p.row * this.pieceH;
        this.applyTransform(p, false);
        p.bx = saved.bx;
        p.by = saved.by;
      }
      void this.container.offsetWidth;
      for (const p of this.pieces) {
        p.el.style.transition = "transform 520ms cubic-bezier(0.22, 1, 0.36, 1)";
        this.applyTransform(p, false);
      }
      window.setTimeout(() => {
        for (const p of this.pieces) p.el.style.transition = "";
      }, 560);
    } else {
      for (const p of this.pieces) this.applyTransform(p, false);
    }
  }

  private applyTransform(p: Piece, lifting: boolean) {
    const x = this.boardX + p.bx - this.pad;
    const y = this.boardY + p.by - this.pad;
    const scale = lifting && !p.placed ? 1.045 : 1;
    p.el.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    p.el.style.zIndex = String(p.z);
    p.el.classList.toggle("is-placed", p.placed);
    p.el.classList.toggle("is-lifting", lifting && !p.placed);
  }

  private handleResize() {
    const oldW = this.boardW;
    this.layout();
    const s = this.boardW / oldW;
    for (const p of this.pieces) {
      p.bx *= s;
      p.by *= s;
      this.paintPiece(p);
      this.applyTransform(p, false);
    }
  }

  private localPoint(e: PointerEvent, p: Piece) {
    const r = p.el.getBoundingClientRect();
    const cw = this.pieceW + this.pad * 2;
    const ch = this.pieceH + this.pad * 2;
    return {
      x: ((e.clientX - r.left) * cw) / Math.max(1, r.width),
      y: ((e.clientY - r.top) * ch) / Math.max(1, r.height),
    };
  }

  private hits(e: PointerEvent): Piece | null {
    const ordered = [...this.pieces].sort((a, b) => b.z - a.z);
    for (const p of ordered) {
      const ctx = p.el.getContext("2d");
      if (!ctx) continue;
      const { x, y } = this.localPoint(e, p);
      ctx.save();
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      const ok = ctx.isPointInPath(p.path, x, y);
      ctx.restore();
      if (ok) return p;
    }
    return null;
  }

  private handleDown(e: PointerEvent) {
    if (this.complete) return;
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const hit = this.hits(e);
    if (!hit || hit.placed) return;
    e.preventDefault();
    unlockAudio();
    playPickup();

    const group = this.pieces.filter((p) => p.group === hit.group);
    this.zTop += group.length + 1;
    group.forEach((p, i) => {
      p.z = this.zTop + i;
    });
    hit.z = this.zTop + group.length;

    const origin = new Map<number, { bx: number; by: number }>();
    for (const p of group) origin.set(p.id, { bx: p.bx, by: p.by });

    this.drag = {
      ids: group.map((p) => p.id),
      startX: e.clientX,
      startY: e.clientY,
      origin,
      pointerId: e.pointerId,
      moved: false,
    };
    try {
      this.container.setPointerCapture(e.pointerId);
    } catch {
      // capture not available
    }
    for (const p of group) {
      p.el.style.transition = "none";
      this.applyTransform(p, true);
    }
  }

  private handleMove(e: PointerEvent) {
    const drag = this.drag;
    if (!drag || e.pointerId !== drag.pointerId) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) > 3) {
      drag.moved = true;
      this.startTimer();
    }
    for (const id of drag.ids) {
      const p = this.pieces[id]!;
      const o = drag.origin.get(id)!;
      p.bx = o.bx + dx;
      p.by = o.by + dy;
    }
    this.clampGroup(drag.ids);
    for (const id of drag.ids) {
      this.applyTransform(this.pieces[id]!, true);
    }
  }

  private handleUp(e: PointerEvent) {
    const drag = this.drag;
    if (!drag || e.pointerId !== drag.pointerId) return;
    this.drag = null;
    try {
      this.container.releasePointerCapture(e.pointerId);
    } catch {
      // already released
    }

    const ids = drag.ids;
    this.clampGroup(ids);
    const snapped = this.resolveConnections(ids);
    const group = this.pieces.filter((p) => p.group === this.pieces[ids[0]!]!.group);

    const easing = this.reduced
      ? "none"
      : "transform 180ms cubic-bezier(0.22, 1, 0.36, 1), filter 180ms ease";
    for (const p of group) {
      p.el.style.transition = easing;
      this.applyTransform(p, false);
    }

    if (snapped === "board") playSnap();
    else if (snapped === "group") playGroup();

    this.emitStats();
    this.checkComplete();
  }

  private startTimer() {
    if (this.timerStarted || this.complete) return;
    this.timerStarted = true;
    this.t0 = performance.now();
    this.elapsedMs = 0;
    this.emitStats();
  }

  private clampGroup(ids: number[]) {
    const rect = this.container.getBoundingClientRect();
    const inset = 6;
    const group = ids.map((id) => this.pieces[id]!);
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of group) {
      minX = Math.min(minX, p.bx);
      minY = Math.min(minY, p.by);
      maxX = Math.max(maxX, p.bx + this.pieceW);
      maxY = Math.max(maxY, p.by + this.pieceH);
    }
    const minBx = inset - this.boardX;
    const minBy = inset - this.boardY;
    const maxBx = rect.width - inset - this.boardX;
    const maxBy = rect.height - inset - this.boardY;
    let dx = 0;
    let dy = 0;
    if (minX < minBx) dx = minBx - minX;
    if (minY < minBy) dy = minBy - minY;
    if (maxX + dx > maxBx) dx = maxBx - maxX;
    if (maxY + dy > maxBy) dy = maxBy - maxY;
    if (dx === 0 && dy === 0) return;
    for (const p of group) {
      p.bx += dx;
      p.by += dy;
    }
  }

  private neighbors(p: Piece): Piece[] {
    const out: Piece[] = [];
    const tryGet = (r: number, c: number) => {
      if (r < 0 || c < 0 || r >= this.rows || c >= this.cols) return;
      out.push(this.pieces[r * this.cols + c]!);
    };
    tryGet(p.row - 1, p.col);
    tryGet(p.row + 1, p.col);
    tryGet(p.row, p.col - 1);
    tryGet(p.row, p.col + 1);
    return out;
  }

  private merge(a: number, b: number) {
    if (a === b) return;
    for (const p of this.pieces) {
      if (p.group === b) p.group = a;
    }
  }

  private resolveConnections(draggedIds: number[]): "board" | "group" | null {
    let kind: "board" | "group" | null = null;
    let guard = 0;
    let changed = true;
    while (changed && guard < 48) {
      changed = false;
      guard += 1;
      const seed = this.pieces[draggedIds[0]!]!;
      const groupId = seed.group;
      const group = this.pieces.filter((p) => p.group === groupId);

      for (const p of group) {
        for (const n of this.neighbors(p)) {
          if (n.group === p.group) continue;
          const expX = p.bx + (n.col - p.col) * this.pieceW;
          const expY = p.by + (n.row - p.row) * this.pieceH;
          const dist = Math.hypot(n.bx - expX, n.by - expY);
          if (dist > this.snapPx) continue;
          const dx = n.bx - expX;
          const dy = n.by - expY;
          for (const q of group) {
            q.bx += dx;
            q.by += dy;
          }
          this.merge(p.group, n.group);
          if (n.placed) {
            this.lockGroup(p.group);
            kind = "board";
          } else if (kind !== "board") {
            kind = "group";
          }
          changed = true;
        }
        if (changed) break;
      }
      if (changed) continue;

      const leader = group[0]!;
      const errX = leader.bx - leader.col * this.pieceW;
      const errY = leader.by - leader.row * this.pieceH;
      if (Math.hypot(errX, errY) <= this.snapPx) {
        this.lockGroup(leader.group);
        kind = "board";
        changed = true;
      }
    }
    return kind;
  }

  private lockGroup(groupId: number) {
    for (const p of this.pieces) {
      if (p.group !== groupId) continue;
      p.bx = p.col * this.pieceW;
      p.by = p.row * this.pieceH;
      p.placed = true;
      p.z = 1;
    }
  }

  private checkComplete() {
    if (this.complete) return;
    if (!this.pieces.every((p) => p.placed)) return;
    this.complete = true;
    if (!this.timerStarted) {
      this.timerStarted = true;
      this.elapsedMs = 0;
    } else {
      this.elapsedMs = performance.now() - this.t0;
    }
    playComplete();
    const { bestMs, isRecord } = setBest(
      this.imageId,
      this.cols * this.rows,
      this.elapsedMs,
    );
    this.emitStats();
    window.setTimeout(() => {
      if (this.destroyed) return;
      this.onComplete({
        elapsedMs: this.elapsedMs,
        bestMs,
        isRecord,
        cols: this.cols,
        rows: this.rows,
        imageId: this.imageId,
        imageTitle: this.imageTitle,
      });
    }, this.reduced ? 80 : 280);
  }

  private flashSlot(col: number, row: number) {
    this.hintEl?.remove();
    const el = document.createElement("div");
    el.className = "puzzle-hint-slot";
    el.style.left = `${col * this.pieceW}px`;
    el.style.top = `${row * this.pieceH}px`;
    el.style.width = `${this.pieceW}px`;
    el.style.height = `${this.pieceH}px`;
    this.boardEl.appendChild(el);
    this.hintEl = el;
    window.setTimeout(() => {
      el.remove();
      if (this.hintEl === el) this.hintEl = null;
    }, 1400);
  }

  private handleKey(e: KeyboardEvent) {
    if (e.key === "h" || e.key === "H") this.hint();
  }

  getBestTime() {
    return getBest(this.imageId, this.cols * this.rows);
  }
}
