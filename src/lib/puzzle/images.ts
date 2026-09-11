import type { GalleryImage } from "./types";

export const GALLERY: GalleryImage[] = [
  {
    id: "moss",
    src: `${import.meta.env.BASE_URL}puzzles/moss.jpg`,
    title: "苔庭",
    place: "朝の霧",
  },
  {
    id: "lake",
    src: `${import.meta.env.BASE_URL}puzzles/lake.jpg`,
    title: "山湖",
    place: "青い刻",
  },
  {
    id: "harbor",
    src: `${import.meta.env.BASE_URL}puzzles/harbor.jpg`,
    title: "港町",
    place: "午後の光",
  },
  {
    id: "atelier",
    src: `${import.meta.env.BASE_URL}puzzles/atelier.jpg`,
    title: "工房",
    place: "静かな机",
  },
];

export async function imageFromFile(file: File): Promise<{
  src: string;
  id: string;
  title: string;
}> {
  if (!file.type.startsWith("image/")) {
    throw new Error("画像ファイルを選んでください");
  }

  const bitmap = await createImageBitmap(file);
  const max = 1600;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("画像を処理できませんでした");
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const src = canvas.toDataURL("image/jpeg", 0.9);
  const name = file.name.replace(/\.[^.]+$/, "").slice(0, 24) || "アップロード";
  return { src, id: `upload-${Date.now()}`, title: name };
}

export function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
    img.src = src;
  });
}
