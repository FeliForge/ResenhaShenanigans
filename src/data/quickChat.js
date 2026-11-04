// @ts-nocheck
// Quick chat: solo frases prefijadas. Los textos viven en el sistema de i18n.
// El cliente envía solo el id de la frase (nada de texto libre).

export const QUICK_CHAT = {
  greeting: { id: "greeting", phrases: [{ id: "hello" }, { id: "ready" }, { id: "goodluck" }] },
  taunt: { id: "taunt", phrases: [{ id: "comeon" }, { id: "tooeasy" }, { id: "nicetry" }] },
  strategy: { id: "strategy", phrases: [{ id: "groupup" }, { id: "spread" }, { id: "focus" }] },
  callout: { id: "callout", phrases: [{ id: "behind" }, { id: "ultready" }, { id: "needhelp" }] },
  gg: { id: "gg", phrases: [{ id: "gg" }, { id: "wp" }, { id: "rematch" }] },
};