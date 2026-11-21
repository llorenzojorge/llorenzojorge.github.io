/** Alterna entre tema escuro (padrão) e claro, lembrando a escolha do visitante. */
import { EVENTS, STORAGE_KEYS } from "../core/config.js";
import { root, storage } from "../core/utils.js";

const THEME_COLORS = { dark: "#100e18", light: "#f5f3fa" };

function setTheme(theme) {
  root.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]').content = THEME_COLORS[theme];
  document.dispatchEvent(new CustomEvent(EVENTS.themeChange, { detail: { theme } }));
}

export function initTheme(button) {
  setTheme(root.dataset.theme === "light" ? "light" : "dark");
  button.addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    storage.set(STORAGE_KEYS.theme, next);
    setTheme(next);
  });
}
