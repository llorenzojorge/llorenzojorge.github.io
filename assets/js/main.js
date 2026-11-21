/**
 * Ponto de entrada. Inicializa cada módulo e coordena a abertura:
 * tela de boot → título e terminal animando → Chevettinho chegando na estrada.
 */
import { root, sleep } from "./core/utils.js";
import { applyTranslations, initLanguageToggle } from "./i18n/index.js";
import { initReveal, playSplit } from "./modules/reveal.js";
import { playTerminal } from "./modules/hero.js";
import { initProjects } from "./modules/projects.js";
import { initContact } from "./modules/contact.js";
import { initRoadmap } from "./modules/roadmap.js";
import { playBoot } from "./modules/boot.js";
import { initChevettinho } from "./modules/chevettinho.js";

initLanguageToggle(document.getElementById("lang-toggle"));
initReveal();
applyTranslations();
initProjects();
initContact();
const roadmap = initRoadmap();
const startChevettinho = initChevettinho(roadmap);

(async () => {
  window.scrollTo(0, 0);
  await playBoot();
  root.classList.add("is-loaded");
  playSplit(document.querySelector(".hero__title"), 150);
  playTerminal();
  await sleep(900);
  startChevettinho();
})();
