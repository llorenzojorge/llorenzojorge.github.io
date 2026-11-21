/**
 * Ponto de entrada. Inicializa cada módulo e coordena a sequência de abertura:
 * tela de boot → título e terminal animando.
 */
import { root } from "./core/utils.js";
import { applyTranslations, initLanguageToggle } from "./i18n/index.js";
import { initTheme } from "./modules/theme.js";
import { initNavigation } from "./modules/navigation.js";
import { initReveal, playSplit } from "./modules/reveal.js";
import { initHero, playTerminal } from "./modules/hero.js";
import { initProjects } from "./modules/projects.js";
import { initContact } from "./modules/contact.js";
import { initBackground } from "./modules/background.js";
import { playBoot } from "./modules/boot.js";

initTheme(document.getElementById("theme-toggle"));
initLanguageToggle(document.getElementById("lang-toggle"));
initReveal();
applyTranslations();
initNavigation();
initHero();
initProjects();
initContact();
initBackground(document.getElementById("topology"));

(async () => {
  window.scrollTo(0, 0);
  await playBoot();
  root.classList.add("is-loaded");
  playSplit(document.querySelector(".hero__title"), 150);
  playTerminal();
})();
