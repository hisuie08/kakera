import { useRef, useState } from "react";
import { ImagePlus, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DIFFICULTIES, chooseGrid } from "@/lib/puzzle/grid";
import { GALLERY, imageFromFile, loadHtmlImage } from "@/lib/puzzle/images";
import type { GalleryImage, PuzzleConfig } from "@/lib/puzzle/types";

type Props = {
  onStart: (config: PuzzleConfig) => void;
};

export function SetupScreen({ onStart }: Props) {
  const [selected, setSelected] = useState<GalleryImage>(GALLERY[0]!);
  const [extra, setExtra] = useState<GalleryImage[]>([]);
  const [pieces, setPieces] = useState(24);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const gallery = [...GALLERY, ...extra];

  async function handleFiles(list: FileList | null) {
    const file = list?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const uploaded = await imageFromFile(file);
      const item: GalleryImage = {
        id: uploaded.id,
        src: uploaded.src,
        title: uploaded.title,
        place: "あなたの画像",
      };
      setExtra((prev) => [item, ...prev].slice(0, 4));
      setSelected(item);
    } catch {
      setError("この画像は読み込めませんでした。JPEG / PNG / WebP を試してください。");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const img = await loadHtmlImage(selected.src);
      const aspect = img.naturalWidth / img.naturalHeight || 4 / 3;
      const { cols, rows } = chooseGrid(aspect, pieces);
      onStart({
        imageId: selected.id,
        imageSrc: selected.src,
        imageTitle: selected.title,
        cols,
        rows,
      });
    } catch {
      setError("画像の読み込みに失敗しました。");
      setBusy(false);
    }
  }

  return (
    <div className="kakera-setup relative mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-5 pb-10 pt-8 sm:px-8 sm:pt-12">
      <header className="mb-8 sm:mb-10">
        <p className="font-sans text-xs font-medium tracking-[0.28em] text-muted-foreground">
          KAKERA
        </p>
        <h1 className="font-display mt-3 text-4xl font-medium tracking-[-0.03em] text-foreground text-balance sm:text-5xl">
          カケラ
        </h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground text-pretty">
          静かなジグソー。絵を選んで、ピースを寄せ、はまり込む感触を楽しむ。
        </p>
      </header>

      <section className="flex flex-1 flex-col gap-8">
        <div>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-medium text-foreground">絵を選ぶ</h2>
            <p className="text-xs text-muted-foreground">タップして選択</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {gallery.map((img, i) => {
              const active = selected.id === img.id;
              return (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setSelected(img)}
                  className={cn(
                    "group relative aspect-4/3 overflow-hidden rounded-lg text-left",
                    "bg-card ring-1 ring-border transition-[transform,box-shadow] duration-(--motion-fast) ease-(--ease-smooth-out)",
                    "active:scale-[0.98]",
                    active
                      ? "ring-2 ring-primary shadow-[0_0_0_4px_rgb(231_227_218/0.12)]"
                      : "hover:ring-border-strong",
                  )}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <img
                    src={img.src}
                    alt={img.title}
                    className="size-full object-cover transition-transform duration-(--motion-slow) ease-(--ease-smooth-out) group-hover:scale-[1.03]"
                    draggable={false}
                  />
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-background/80 to-transparent px-2.5 pb-2 pt-8">
                    <span className="block text-sm font-medium text-foreground">
                      {img.title}
                    </span>
                    <span className="block text-2xs text-muted-foreground">
                      {img.place}
                    </span>
                  </span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className={cn(
                "relative flex aspect-4/3 flex-col items-center justify-center gap-2 rounded-lg",
                "border border-dashed border-border bg-card/60 text-muted-foreground",
                "transition-[background-color,border-color,color] duration-(--motion-fast)",
                "hover:border-primary/40 hover:bg-secondary hover:text-foreground",
              )}
            >
              {busy ? (
                <LoaderCircle className="size-5 animate-spin" />
              ) : (
                <ImagePlus className="size-5" />
              )}
              <span className="px-3 text-center text-xs font-medium">
                画像を
                <br className="sm:hidden" />
                アップロード
              </span>
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => void handleFiles(e.target.files)}
          />
        </div>

        <div>
          <h2 className="mb-3 text-sm font-medium text-foreground">難易度</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {DIFFICULTIES.map((d) => {
              const active = pieces === d.pieces;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setPieces(d.pieces)}
                  className={cn(
                    "flex h-16 flex-col items-start justify-center rounded-md px-3.5 text-left",
                    "border transition-[background-color,border-color] duration-(--motion-fast)",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground hover:bg-secondary",
                  )}
                >
                  <span className="text-sm font-medium">{d.label}</span>
                  <span
                    className={cn(
                      "text-2xs tabular-nums",
                      active
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground",
                    )}
                  >
                    {d.hint}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-relaxed text-muted-foreground">
            最初のピースを動かし始めた瞬間から、完成までの時間を測ります。
          </p>
          <Button
            size="lg"
            onClick={() => void start()}
            disabled={busy}
            className="min-w-44"
          >
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
            この絵ではじめる
          </Button>
        </div>
      </section>
    </div>
  );
}
