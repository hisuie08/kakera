import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { KakeraApp } from "@/components/puzzle/kakera-app";
import "@/styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <main className="min-h-dvh">
      <KakeraApp />
    </main>
  </StrictMode>,
);
