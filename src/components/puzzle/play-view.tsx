import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Clock3,
  Eye,
  HelpCircle,
  ImageIcon,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PuzzleEngine } from "@/lib/puzzle/engine";
import { burstConfetti } from "@/lib/puzzle/confetti";
import { formatTime } from "@/lib/puzzle/grid";
import { loadHtmlImage } from "@/lib/puzzle/images";
import { getMuted, setMutedSave } from "@/lib/puzzle/storage";
import { isMuted, setMuted, unlockAudio } from "@/lib/puzzle/audio";
import type { CompleteInfo, PuzzleConfig, PuzzleStats } from "@/lib/puzzle/types";
import { cn } from "@/lib/utils";

type Props = {
  config: PuzzleConfig;
  onExit: () => void;
  onReplay: () => void;
};

const IDLE_STATS: PuzzleStats = {
  placed: 0,
  total: 0,
  elapsedMs: 0,
  started: false,
  complete: false,
};

export function PlayView({ config, onExit, onReplay }: Props) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<PuzzleEngine | null>(null);
  const [stats, setStats] = useState<PuzzleStats>(IDLE_STATS);
  const [complete, setComplete] = useState<CompleteInfo | null>(null);
  const [preview, setPreview] = useState(false);
  const [muted, setMutedState] = useState(false);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setMuted(getMuted());
    setMutedState(isMuted());
  }, []);

  useEffect(() => {
    const el = fieldRef.current;
    if (!el) return;
    let cancelled = false;
    let engine: PuzzleEngine | null = null;

    void (async () => {
      try {
        const img = await loadHtmlImage(config.imageSrc);
        if (cancelled) return;
        await new Promise<void>((r) =>
          requestAnimationFrame(() => requestAnimationFrame(() => r())),
        );
        if (cancelled || !fieldRef.current) return;
        engine = new PuzzleEngine({
          container: fieldRef.current,
          image: img,
          cols: config.cols,
          rows: config.rows,
          imageId: config.imageId,
          imageTitle: config.imageTitle,
          onStats: (next) => {
            if (!cancelled) setStats(next);
          },
          onComplete: (info) => {
            if (cancelled) return;
            setComplete(info);
            if (overlayRef.current) burstConfetti(overlayRef.current);
          },
        });
        engineRef.current = engine;
        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) setLoadError("パズルを準備できませんでした。");
      }
    })();

    return () => {
      cancelled = true;
      engine?.destroy();
      engineRef.current = null;
    };
  }, [config]);

  useEffect(() => {
    engineRef.current?.setGhostVisible(preview);
  }, [preview]);

  function toggleMute() {
    unlockAudio();
    const next = !isMuted();
    setMuted(next);
    setMutedSave(next);
    setMutedState(next);
  }

  const total = config.cols * config.rows;
  const placed = stats.total ? stats.placed : 0;

  return (
    <div
      ref={overlayRef}
      className="relative flex h-dvh min-h-dvh flex-col overflow-hidden bg-background text-foreground"
    >
      <header className="relative z-20 flex items-center gap-2 px-3 py-2.5 sm:px-5 sm:py-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onExit}
          aria-label="絵の選択に戻る"
        >
          <ArrowLeft />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{config.imageTitle}</p>
          <p className="text-2xs text-muted-foreground tabular-nums">
            {config.cols} × {config.rows}
            <span className="mx-1.5 text-muted-foreground/50">·</span>
            {placed} / {total} ピース
          </p>
        </div>
        <div
          className={cn(
            "flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5",
            "text-sm tabular-nums tracking-tight",
          )}
          aria-live="polite"
        >
          <Clock3 className="size-3.5 text-muted-foreground" />
          <span className={stats.started ? "text-foreground" : "text-muted-foreground"}>
            {stats.started ? formatTime(stats.elapsedMs) : "00:00.00"}
          </span>
        </div>
        <Button
          variant={preview ? "secondary" : "ghost"}
          size="icon-sm"
          onClick={() => setPreview((v) => !v)}
          aria-pressed={preview}
          aria-label="完成図を表示"
        >
          <Eye />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => engineRef.current?.hint()}
          aria-label="ヒント"
        >
          <HelpCircle />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleMute}
          aria-label={muted ? "サウンドをオン" : "サウンドをオフ"}
        >
          {muted ? <VolumeX /> : <Volume2 />}
        </Button>
      </header>

      <div className="relative min-h-0 flex-1">
        <div ref={fieldRef} className="absolute inset-0" />
        {!ready && !loadError ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center text-sm text-muted-foreground">
            ピースを切り出しています
          </div>
        ) : null}
        {loadError ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-sm text-danger">{loadError}</p>
            <Button variant="outline" onClick={onExit}>
              戻る
            </Button>
          </div>
        ) : null}
        {ready && !stats.started && !complete ? (
          <p className="pointer-events-none absolute bottom-16 left-0 right-0 z-10 px-4 text-center text-xs text-muted-foreground">
            ピースを動かし始めると計測が始まります
          </p>
        ) : null}
      </div>

      {complete ? (
        <CompleteCard
          info={complete}
          imageSrc={config.imageSrc}
          onReplay={onReplay}
          onExit={onExit}
        />
      ) : null}
    </div>
  );
}

function CompleteCard({
  info,
  imageSrc,
  onReplay,
  onExit,
}: {
  info: CompleteInfo;
  imageSrc: string;
  onReplay: () => void;
  onExit: () => void;
}) {
  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center bg-background/55 p-4 sm:items-center">
      <div
        role="dialog"
        aria-labelledby="kakera-complete-title"
        className="complete-card w-full max-w-md overflow-hidden rounded-xl border border-border bg-card shadow-[0_24px_80px_rgb(0_0_0/0.45)]"
      >
        <div className="relative aspect-16/7 overflow-hidden bg-secondary">
          <img
            src={imageSrc}
            alt=""
            className="size-full object-cover"
            draggable={false}
          />
        </div>
        <div className="px-5 py-5 sm:px-6">
          <p className="text-2xs font-medium tracking-[0.22em] text-muted-foreground">
            COMPLETE
          </p>
          <h2
            id="kakera-complete-title"
            className="font-display mt-1 text-3xl font-medium tracking-[-0.03em] text-foreground"
          >
            完成しました
          </h2>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Stat label="タイム" value={formatTime(info.elapsedMs)} />
            <Stat
              label={info.isRecord ? "新記録" : "自己ベスト"}
              value={formatTime(info.bestMs)}
              accent={info.isRecord}
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {info.imageTitle} · {info.cols} × {info.rows}
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button className="flex-1" onClick={onReplay}>
              もう一度
            </Button>
            <Button variant="outline" className="flex-1" onClick={onExit}>
              <ImageIcon />
              別の絵
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-secondary/60 px-3 py-2.5">
      <p className="text-2xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-0.5 font-medium tabular-nums tracking-tight",
          accent ? "text-moss-fg" : "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}
