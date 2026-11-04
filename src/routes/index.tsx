import { createFileRoute } from "@tanstack/react-router";
import GameApp from "@/components/game/GameApp";

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
  component: GameApp,
});
