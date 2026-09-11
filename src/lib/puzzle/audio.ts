let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfx: GainNode | null = null;
let muted = false;

function ensure(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    ctx = new AC({ latencyHint: "interactive" });
    master = ctx.createGain();
    sfx = ctx.createGain();
    sfx.gain.value = 0.55;
    master.gain.value = muted ? 0 : 0.85;
    sfx.connect(master);
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") {
    void ctx.resume();
  }
  return ctx;
}

export function unlockAudio() {
  ensure();
}

export function setMuted(next: boolean) {
  muted = next;
  if (master && ctx) {
    master.gain.setTargetAtTime(next ? 0 : 0.85, ctx.currentTime, 0.02);
  }
}

export function isMuted() {
  return muted;
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType,
  gain: number,
  when = 0,
  slideTo?: number,
) {
  const ac = ensure();
  if (!ac || !sfx) return;
  const t = ac.currentTime + when;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo != null) {
    osc.frequency.exponentialRampToValueAtTime(slideTo, t + duration);
  }
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(g);
  g.connect(sfx);
  osc.start(t);
  osc.stop(t + duration + 0.02);
  osc.onended = () => {
    osc.disconnect();
    g.disconnect();
  };
}

export function playPickup() {
  const jitter = 0.94 + Math.random() * 0.12;
  tone(220 * jitter, 0.07, "sine", 0.09);
  tone(440 * jitter, 0.05, "triangle", 0.04);
}

export function playSnap() {
  const jitter = 0.96 + Math.random() * 0.08;
  tone(190 * jitter, 0.08, "sine", 0.16);
  tone(520 * jitter, 0.07, "triangle", 0.08);
  tone(880 * jitter, 0.05, "square", 0.025);
}

export function playGroup() {
  const jitter = 0.97 + Math.random() * 0.06;
  tone(262 * jitter, 0.09, "sine", 0.12);
  tone(392 * jitter, 0.1, "triangle", 0.08, 0.02);
}

export function playComplete() {
  tone(523.25, 0.18, "sine", 0.14, 0);
  tone(659.25, 0.2, "sine", 0.12, 0.09);
  tone(783.99, 0.28, "triangle", 0.12, 0.18);
  tone(1046.5, 0.4, "sine", 0.1, 0.3);
}
