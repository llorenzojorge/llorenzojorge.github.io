/**
 * Ponto de entrada. Inicializa cada módulo e anima a entrada do hero.
 */
import { root } from "./core/utils.js";
import { applyTranslations, initLanguageToggle } from "./i18n/index.js";
import { initTheme } from "./modules/theme.js";
import { initNavigation } from "./modules/navigation.js";
import { initReveal, playSplit } from "./modules/reveal.js";
import { initHero, playTerminal } from "./modules/hero.js";
import { initProjects } from "./modules/projects.js";
import { initContact } from "./modules/contact.js";

initTheme(document.getElementById("theme-toggle"));
initLanguageToggle(document.getElementById("lang-toggle"));
initReveal();
applyTranslations();
initNavigation();
initHero();
initProjects();
initContact();

root.classList.add("is-loaded");
playSplit(document.querySelector(".hero__title"), 150);
playTerminal();
