/**
 * Internacionalização (PT/EN).
 *
 * No HTML:
 *   data-i18n="chave"       → troca o texto do elemento
 *   data-i18n-html="chave"  → troca o HTML (para textos com <em>, <strong>…)
 *   data-split              → além de traduzir, divide em palavras para animar
 */
import { EVENTS, STORAGE_KEYS } from "../core/config.js";
import { root, storage, splitWords } from "../core/utils.js";
import pt from "./pt.js";
import en from "./en.js";

const dictionaries = { pt, en };
let current = root.lang === "en" ? "en" : "pt";

export const getLang = () => current;

/** Texto da chave no idioma atual, com o português como reserva. */
export const t = (key) => dictionaries[current][key] ?? dictionaries.pt[key] ?? key;

export function applyTranslations() {
  root.lang = current === "en" ? "en" : "pt-BR";
  document.title = t("meta.title");

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });

  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    el.innerHTML = t(el.dataset.i18nHtml);
    if (el.hasAttribute("data-split")) splitWords(el);
  });

  document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    el.setAttribute("aria-label", t(el.dataset.i18nAria));
  });

  document.dispatchEvent(new CustomEvent(EVENTS.langChange, { detail: { lang: current } }));
}

export function initLanguageToggle(button) {
  button.addEventListener("click", () => {
    current = current === "pt" ? "en" : "pt";
    storage.set(STORAGE_KEYS.lang, current);
    applyTranslations();
  });
}
