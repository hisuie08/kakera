import { useCallback, useState } from "react";
import { PlayView } from "./play-view";
import { SetupScreen } from "./setup-screen";
import type { PuzzleConfig } from "@/lib/puzzle/types";

export function KakeraApp() {
  const [config, setConfig] = useState<PuzzleConfig | null>(null);
  const [playKey, setPlayKey] = useState(0);

  const start = useCallback((next: PuzzleConfig) => {
    setConfig(next);
    setPlayKey((k) => k + 1);
  }, []);

  const exit = useCallback(() => {
    setConfig(null);
  }, []);

  const replay = useCallback(() => {
    setPlayKey((k) => k + 1);
  }, []);

  if (!config) {
    return <SetupScreen onStart={start} />;
  }

  return <PlayView key={playKey} config={config} onExit={exit} onReplay={replay} />;
}
