/** Rolagem suave com duração controlada, usada para sincronizar a página com a viagem do Chevettinho. */
import { NAV_OFFSET } from "./config.js";
import { root } from "./utils.js";

const easeInOutCubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

export function scrollToY(y, duration = 1100) {
  const start = window.scrollY;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const end = Math.max(0, Math.min(y, max));
  if (Math.abs(end - start) < 4) {
    window.scrollTo(0, end);
    return Promise.resolve();
  }

  root.style.scrollBehavior = "auto"; // o scroll-behavior: smooth do CSS brigaria com a animação manual
  const startedAt = performance.now();

  return new Promise((resolve) => {
    const tick = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      window.scrollTo(0, start + (end - start) * easeInOutCubic(progress));
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        root.style.scrollBehavior = "";
        resolve();
      }
    };
    requestAnimationFrame(tick);
  });
}

/** Posição de rolagem de uma seção, já descontando a navegação fixa. */
export function offsetOf(selector) {
  if (selector === "#top") return 0;
  return document.querySelector(selector).getBoundingClientRect().top + window.scrollY - NAV_OFFSET;
}
