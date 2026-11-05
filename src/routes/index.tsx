import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ComponentType } from "react";

function Home() {
  const [App, setApp] = useState<ComponentType | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod = await import("@/components/game/GameApp");
        if (!cancelled) setApp(() => mod.default);
      } catch (e: any) {
        console.error("[Home] GameApp load failed", e);
        if (!cancelled) setErr(String(e?.message || e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (err) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#0a0a14] px-4 text-white">
        <p className="text-lg font-bold text-[#ff9620]">Error cargando el juego</p>
        <p className="max-w-md text-center text-sm text-white/60">{err}</p>
        <button
          className="rounded-lg bg-white/10 px-4 py-2 text-sm"
          onClick={() => location.reload()}
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!App) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#0a0a14] text-white">
        <p className="text-lg font-bold text-[#ff9620]">Cargando Resenha Shenanigans…</p>
      </div>
    );
  }

  return <App />;
}

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Resenha Shenanigans — Street brawler arena" },
      {
        name: "description",
        content: "Arena de peleas en la ciudad. Elige luchador, cumple misiones y entra a una sala.",
      },
      { property: "og:title", content: "Resenha Shenanigans" },
      {
        property: "og:description",
        content: "Arena de peleas en la ciudad. Elige luchador, cumple misiones y entra a una sala.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});
