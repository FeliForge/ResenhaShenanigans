import { createFileRoute } from "@tanstack/react-router";

function Home() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-[#0a0a14] text-white">
      <h1 className="text-3xl font-black tracking-tight">
        Resenha <span className="text-[#ff9620]">Shenanigans</span>
      </h1>
      <p className="text-sm text-white/60">Diagnóstico: página mínima OK</p>
      <a
        href="/?play=1"
        className="rounded-xl bg-gradient-to-r from-[#ff9620] to-[#ff3b2f] px-6 py-3 text-sm font-bold uppercase tracking-wider text-[#0a0a14]"
      >
        Entrar al juego
      </a>
    </div>
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
    ],
  }),
  component: Home,
});
