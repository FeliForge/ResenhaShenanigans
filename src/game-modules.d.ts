declare module "@/lib/i18n" {
  export const LanguageProvider: (props: { children: import("react").ReactNode }) => import("react").JSX.Element;
}
declare module "@/components/game/GameApp" {
  const GameApp: () => import("react").JSX.Element;
  export default GameApp;
}
