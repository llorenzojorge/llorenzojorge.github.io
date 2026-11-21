/** Posições de rolagem das seções. */

/** Posição de rolagem do topo de uma seção, limitada ao fim da página. */
export function offsetOf(selector) {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  if (selector === "#top") return 0;
  const top = document.querySelector(selector).getBoundingClientRect().top + window.scrollY;
  return Math.max(0, Math.min(top, max));
}

/** Pula direto para uma posição, sem a rolagem suave do CSS. */
export function jumpTo(y) {
  const html = document.documentElement;
  const previous = html.style.scrollBehavior;
  html.style.scrollBehavior = "auto";
  window.scrollTo(0, y);
  html.style.scrollBehavior = previous;
}
