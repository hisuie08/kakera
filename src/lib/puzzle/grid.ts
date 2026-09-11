export function chooseGrid(
  aspect: number,
  targetPieces: number,
): { cols: number; rows: number } {
  let bestCols = Math.max(2, Math.round(Math.sqrt(targetPieces * aspect)));
  let bestRows = Math.max(2, Math.round(targetPieces / bestCols));
  let bestScore = Infinity;

  const minCols = 2;
  const maxCols = Math.max(3, targetPieces - 2);

  for (let cols = minCols; cols <= maxCols; cols++) {
    const rows = Math.max(2, Math.round(targetPieces / cols));
    const pieces = cols * rows;
    if (pieces < 4) continue;
    const aspectErr = Math.abs(cols / rows - aspect) / Math.max(aspect, 0.01);
    const countErr = Math.abs(pieces - targetPieces) / targetPieces;
    const score = aspectErr * 0.8 + countErr * 1.8;
    if (score < bestScore) {
      bestScore = score;
      bestCols = cols;
      bestRows = rows;
    }
  }

  return { cols: bestCols, rows: bestRows };
}

export function formatTime(ms: number): string {
  const clamped = Math.max(0, Math.floor(ms));
  const totalCs = Math.floor(clamped / 10);
  const cs = totalCs % 100;
  const totalSec = Math.floor(totalCs / 100);
  const s = totalSec % 60;
  const m = Math.floor(totalSec / 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

export const DIFFICULTIES: {
  id: string;
  label: string;
  hint: string;
  pieces: number;
}[] = [
  { id: "easy", label: "かんたん", hint: "12ピース", pieces: 12 },
  { id: "normal", label: "ふつう", hint: "24ピース", pieces: 24 },
  { id: "hard", label: "むずかしい", hint: "48ピース", pieces: 48 },
  { id: "expert", label: "熟練", hint: "96ピース", pieces: 96 },
];
