/** Animações de entrada conforme os elementos aparecem na tela. */
import { EVENTS } from "../core/config.js";

const WORD_STAGGER = 55;
const handlers = new WeakMap();

/** Dispara a animação palavra por palavra de um elemento com [data-split]. */
export function playSplit(el, delay = 0) {
  el.style.setProperty("--base", `${delay}ms`);
  el.classList.add("is-split-in");
  const words = el.querySelectorAll(".w").length;
  // depois da animação, libera o overflow para o itálico não ficar cortado
  setTimeout(() => el.classList.add("is-split-done"), delay + words * WORD_STAGGER + 1000);
}

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    if (el.hasAttribute("data-split")) playSplit(el);
    else el.classList.add("is-in");
    handlers.get(el)?.(el);
    observer.unobserve(el);
  });
}, { rootMargin: "0px 0px -10% 0px" });

/** Observa um elemento; `onEnter` roda uma vez quando ele aparece. */
export function observe(el, onEnter) {
  if (onEnter) handlers.set(el, onEnter);
  observer.observe(el);
}

/** Prepara a marcação que as animações precisam e começa a observar a página. */
export function initReveal() {
  // títulos de seção sobem por trás de uma máscara
  document.querySelectorAll(".section__head h2").forEach((h2) => {
    const span = document.createElement("span");
    span.className = "h2-in";
    span.dataset.i18n = h2.dataset.i18n;
    span.textContent = h2.textContent;
    h2.removeAttribute("data-i18n");
    h2.replaceChildren(span);
  });

  // chips da stack entram um depois do outro
  document.querySelectorAll(".stack__row").forEach((row) => {
    row.querySelectorAll(".chip").forEach((chip, i) => chip.style.setProperty("--c", i));
  });

  document.querySelectorAll(".reveal, .section__head, .timeline, .stack__row").forEach((el) => observe(el));
  document.querySelectorAll("[data-split]").forEach((el) => { if (!el.closest(".hero")) observe(el); });

  // ao trocar de idioma, textos que já estavam visíveis animam de novo
  document.addEventListener(EVENTS.langChange, () => {
    document.querySelectorAll("[data-split].is-split-in").forEach((el) => {
      el.classList.remove("is-split-in", "is-split-done");
      requestAnimationFrame(() => requestAnimationFrame(() => playSplit(el)));
    });
  });
}
