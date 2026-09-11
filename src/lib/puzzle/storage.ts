const KEY = "kakera.v1";

type Save = {
  v: 1;
  best: Record<string, number>;
  muted?: boolean;
};

function empty(): Save {
  return { v: 1, best: {} };
}

function load(): Save {
  if (typeof window === "undefined") return empty();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Save;
    if (parsed?.v !== 1 || typeof parsed.best !== "object" || !parsed.best) {
      return empty();
    }
    return parsed;
  } catch {
    return empty();
  }
}

function persist(save: Save) {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    // quota / private mode
  }
}

export function recordKey(imageId: string, pieces: number) {
  return `${imageId}:${pieces}`;
}

export function getBest(imageId: string, pieces: number): number | null {
  const t = load().best[recordKey(imageId, pieces)];
  return typeof t === "number" ? t : null;
}

export function setBest(
  imageId: string,
  pieces: number,
  ms: number,
): { bestMs: number; isRecord: boolean } {
  const save = load();
  const k = recordKey(imageId, pieces);
  const prev = save.best[k];
  if (prev == null || ms < prev) {
    save.best[k] = ms;
    persist(save);
    return { bestMs: ms, isRecord: true };
  }
  return { bestMs: prev, isRecord: false };
}

export function getMuted(): boolean {
  return load().muted === true;
}

export function setMutedSave(muted: boolean) {
  const save = load();
  save.muted = muted;
  persist(save);
}
