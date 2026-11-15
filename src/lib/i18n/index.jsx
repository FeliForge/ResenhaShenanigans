// @ts-nocheck
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { PT } from "./pt";
import { EN } from "./en";
import { ES } from "./es";
import { FR } from "./fr";
import { DE } from "./de";
import { ZH } from "./zh";
import { UI_TEXT_A } from "./uiTextA";
import { UI_TEXT_B } from "./uiTextB";
import { UI_TEXT_C } from "./uiTextC";
import { localChar, localMove } from "@/data/characters-i18n";

const DICTS = { pt: PT, en: EN, es: ES, fr: FR, de: DE, zh: ZH };
const STORAGE_KEY = "resenha_lang";
export const LANGS = ["pt", "en", "es", "fr", "de", "zh"];

const I18nContext = createContext({ lang: "pt", setLang: () => {}, t: (k) => k });

/* Legacy JSX literals: [source aliases, pt, en, es, fr, de, zh]. */
const UI_TEXT = [...UI_TEXT_A, ...UI_TEXT_B, ...UI_TEXT_C];;

const textOriginals = new WeakMap();
const textOutputs = new WeakMap();
const attributeOriginals = new WeakMap();
const attributeOutputs = new WeakMap();
let activeDomMap = new Map();
let activePrefixes = {};
let activeLang = "pt";

function buildDomMap(lang) {
  activeLang = lang;
  const map = new Map();
  const target = DICTS[lang] || EN;
  for (const sourceLang of LANGS) {
    const source = DICTS[sourceLang] || {};
    for (const [key, sourceValue] of Object.entries(source)) {
      const value = target[key];
      if (
        typeof sourceValue === "string" &&
        typeof value === "string" &&
        sourceValue !== value &&
        !map.has(sourceValue)
      )
        map.set(sourceValue, value);
    }
  }
  const languageIndex = { pt: 1, en: 2, es: 3, fr: 4, de: 5, zh: 6 }[lang] ?? 1;
  activePrefixes = {
    "Conectado:":
      {
        pt: "Conectado:",
        en: "Signed in:",
        es: "Conectado:",
        fr: "Connecté :",
        de: "Angemeldet:",
        zh: "已登录：",
      }[lang] || "Conectado:",
    "Tecla:":
      {
        pt: "Tecla:",
        en: "Key:",
        es: "Tecla:",
        fr: "Touche :",
        de: "Taste:",
        zh: "按键：",
      }[lang] || "Tecla:",
  };
  for (const row of UI_TEXT) {
    const sources = row[0].split("||");
    const value = row[languageIndex] ?? row[1];
    for (const source of sources) if (source && value && !map.has(source)) map.set(source, value);
  }
  return map;
}

function localizeTextNode(node) {
  const current = node.nodeValue ?? "";
  const previous = textOutputs.get(node);
  let original = textOriginals.get(node);
  if (original === undefined || current !== previous) {
    original = current;
    textOriginals.set(node, original);
  }
  const leading = original.match(/^\s*/)?.[0] ?? "";
  const trailing = original.match(/\s*$/)?.[0] ?? "";
  const source = original.slice(leading.length, original.length - trailing.length);
  let translated = activeDomMap.get(source);
  if (!translated) {
    const prefix = Object.keys(activePrefixes).find((key) => source.startsWith(key + " "));
    if (prefix) {
      const suffix = source.slice(prefix.length);
      translated = activePrefixes[prefix] + (activeLang === "zh" ? suffix.trimStart() : suffix);
    }
  }
  const next = translated ? leading + translated + trailing : original;
  textOutputs.set(node, next);
  if (next !== current) node.nodeValue = next;
}

function localizeAttribute(element, name) {
  const current = element.getAttribute(name);
  if (current == null) return;
  let saved = attributeOriginals.get(element);
  if (!saved) {
    saved = new Map();
    attributeOriginals.set(element, saved);
  }
  let outputs = attributeOutputs.get(element);
  if (!outputs) {
    outputs = new Map();
    attributeOutputs.set(element, outputs);
  }
  const previous = outputs.get(name);
  let original = saved.get(name);
  if (original === undefined || current !== previous) {
    original = current;
    saved.set(name, original);
  }
  const translated = activeDomMap.get(original.trim());
  const next = translated ? translated : original;
  outputs.set(name, next);
  if (next !== current) element.setAttribute(name, next);
}

function localizeTree(node) {
  if (node.nodeType === 3) {
    localizeTextNode(node);
    return;
  }
  if (node.nodeType !== 1 && node.nodeType !== 9) return;
  if (node.nodeType === 1 && /^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA|CODE|PRE)$/.test(node.tagName))
    return;
  if (node.nodeType === 1) {
    for (const name of [
      "placeholder",
      "title",
      "aria-label",
      "aria-description",
      "alt",
      "data-tooltip",
    ])
      localizeAttribute(node, name);
  }
  for (const child of Array.from(node.childNodes || [])) localizeTree(child);
}

function observeDomTranslations() {
  if (typeof document === "undefined" || !document.body) return () => {};
  activeDomMap = buildDomMap("pt");
  localizeTree(document.body);
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "characterData") localizeTextNode(mutation.target);
      else if (mutation.type === "attributes")
        localizeAttribute(mutation.target, mutation.attributeName);
      else for (const node of mutation.addedNodes) localizeTree(node);
    }
  });
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: [
      "placeholder",
      "title",
      "aria-label",
      "aria-description",
      "alt",
      "data-tooltip",
    ],
  });
  return () => observer.disconnect();
}

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (LANGS.includes(raw)) return raw;
  } catch {
    /* sin acceso a storage */
  }
  return null;
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState("pt");

  useEffect(() => {
    const stored = readStored();
    if (stored) setLangState(stored);
  }, []);

  const setLang = useCallback((next) => {
    if (!LANGS.includes(next)) return;
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* preferencia solo en memoria */
    }
  }, []);

  const t = useCallback(
    (key, vars) => {
      const dict = DICTS[lang] || PT;
      let str = dict[key] ?? EN[key] ?? key;
      if (vars) {
        for (const [name, value] of Object.entries(vars))
          str = str.split("{" + name + "}").join(String(value));
      }
      return str;
    },
    [lang],
  );

  useEffect(() => observeDomTranslations(), []);
  useEffect(() => {
    activeDomMap = buildDomMap(lang);
    if (typeof document !== "undefined") localizeTree(document.body);
    if (typeof document !== "undefined") {
      const title = "Resenha Shenanigans — Street brawler arena";
      document.title = activeDomMap.get(title) || title;
    }
  }, [lang]);

  const value = useMemo(
    () => ({
      lang,
      setLang,
      t,
      character: (c) => localChar(lang, c),
      move: (characterId, category, move) => localMove(lang, characterId, category, move),
      shopName: (item) => t("shop.item." + item.id) || item.name,
    }),
    [lang, setLang, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
