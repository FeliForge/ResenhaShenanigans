// @ts-nocheck
// Catálogo de misiones diarias y reglas de progreso.
// Compartido por el servidor (generación y validación) y la interfaz.

export const DIFFICULTIES = {
  easy: { label: "Fácil", reward: 40 },
  normal: { label: "Normal", reward: 80 },
  hard: { label: "Difícil", reward: 150 },
};

export const DIFFICULTY_KEYS = ["easy", "normal", "hard"];
export const QUEST_COUNT = 4;

export const QUEST_POOL = [
  { id: "jumps", metric: "jumps", icon: "ArrowUp", title: "Saltarín", description: "Realiza {n} saltos", easy: 20, normal: 45, hard: 80 },
  { id: "distance", metric: "distance", icon: "Footprints", title: "Maratón urbano", description: "Recorre {n} metros", easy: 400, normal: 1000, hard: 1800 },
  { id: "dashes", metric: "dashes", icon: "Zap", title: "Esquiva perfecta", description: "Ejecuta {n} desplazamientos", easy: 8, normal: 15, hard: 25 },
  { id: "damage", metric: "damage", icon: "Flame", title: "Castigo", description: "Inflige {n} puntos de daño", easy: 500, normal: 1000, hard: 2000 },
  { id: "hits", metric: "hits", icon: "Target", title: "Precisión", description: "Impacta {n} ataques", easy: 10, normal: 20, hard: 35 },
  { id: "kills", metric: "kills", icon: "Skull", title: "Sin piedad", description: "Derrota {n} enemigos", easy: 2, normal: 5, hard: 9 },
  { id: "ultimates", metric: "ultimates", icon: "Sparkles", title: "Definitiva", description: "Usa {n} habilidades definitivas", easy: 1, normal: 3, hard: 5 },
  { id: "skills", metric: "skills", icon: "Swords", title: "Repertorio", description: "Utiliza {n} habilidades", easy: 8, normal: 15, hard: 25 },
  { id: "matches", metric: "matches", icon: "Gamepad2", title: "Rutina", description: "Participa en {n} partidas", easy: 1, normal: 2, hard: 4 },
  { id: "multiplayer", metric: "multiplayer", icon: "Users", title: "En compañía", description: "Juega {n} partida(s) en una sala", easy: 1, normal: 1, hard: 2 },
  { id: "playtime", metric: "playtime", icon: "Clock", title: "Resistencia", description: "Sobrevive {n} segundos", easy: 180, normal: 300, hard: 600 },
];

// Tope de progreso aceptado por informe (evita alteraciones desde el cliente).
export const REPORT_CAPS = {
  jumps: 100,
  distance: 2000,
  dashes: 100,
  damage: 5000,
  hits: 300,
  kills: 30,
  ultimates: 20,
  skills: 100,
  matches: 5,
  multiplayer: 2,
  playtime: 600,
};