import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

// .client.tsx is excluded from the server bundle by TanStack Start / Vite.
const GameApp = lazy(() => import("@/components/game/GameAppEntry.client"));

function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full w-full items-center justify-center bg-[#0a0a14] text-white">
          <p className="text-lg font-bold text-[#ff9620]">Cargando Resenha Shenanigans…</p>
        </div>
      }
    >
      <GameApp />
    </Suspense>
  );
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
