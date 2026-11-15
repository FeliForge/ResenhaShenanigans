import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LanguageProvider } from "@/lib/i18n";
import LanguageSelector from "@/components/game/LanguageSelector";
import { useI18n } from "@/lib/i18n";

function Harness() {
  const { t, lang } = useI18n();
  return (
    <div data-lang={lang}>
      <LanguageSelector />
      <p>Character Workshop</p>
      <p>Conectado: player@example.com</p>
      <span>{t("settings.language")}</span>
    </div>
  );
}

describe("language selector and legacy UI translations", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it.each([
    ["pt", "Oficina de personagens", "Conectado: player@example.com"],
    ["en", "Character Workshop", "Signed in: player@example.com"],
    ["es", "Taller de personajes", "Conectado: player@example.com"],
    ["fr", "Atelier de personnages", "Connecté : player@example.com"],
    ["de", "Charakterwerkstatt", "Angemeldet: player@example.com"],
    ["zh", "角色工坊", "已登录：player@example.com"],
  ])("switches all UI text to %s", async (language, workshopLabel, signedInLabel) => {
    render(
      <LanguageProvider>
        <Harness />
      </LanguageProvider>,
    );

    fireEvent.change(screen.getByRole("combobox", { name: "Idioma" }), {
      target: { value: language },
    });

    await waitFor(() => {
      expect(screen.getByText(workshopLabel)).toBeInTheDocument();
      expect(screen.getByText(signedInLabel)).toBeInTheDocument();
    });

    expect(localStorage.getItem("resenha_lang")).toBe(language);
  });
});
