const COLORS = ["#e7e3da", "#c5cdd8", "#4f6b58", "#d4c4a8", "#8b8d92", "#f2efe8"];

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  rot: number;
  vr: number;
  color: string;
  life: number;
};

export function burstConfetti(host: HTMLElement) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText =
    "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:40;";
  host.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    return;
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const resize = () => {
    const r = host.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(r.width * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();

  const w = () => canvas.width / dpr;
  const h = () => canvas.height / dpr;
  const particles: Particle[] = [];
  const count = 90;
  for (let i = 0; i < count; i++) {
    particles.push({
      x: w() * (0.25 + Math.random() * 0.5),
      y: h() * (0.22 + Math.random() * 0.2),
      vx: (Math.random() - 0.5) * 520,
      vy: -180 - Math.random() * 420,
      w: 6 + Math.random() * 7,
      h: 8 + Math.random() * 10,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 8,
      color: COLORS[i % COLORS.length]!,
      life: 1,
    });
  }

  let last = performance.now();
  let elapsed = 0;
  let raf = 0;

  const tick = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    elapsed += dt;
    ctx.clearRect(0, 0, w(), h());

    for (const p of particles) {
      p.vy += 980 * dt;
      p.vx *= 1 - 0.6 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.life -= dt / 1.7;
      if (p.life <= 0) continue;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }

    if (elapsed < 1.8) {
      raf = requestAnimationFrame(tick);
    } else {
      canvas.remove();
    }
  };

  raf = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(raf);
    canvas.remove();
  };
}
