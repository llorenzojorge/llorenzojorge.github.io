/** Utilitários sem estado, usados por vários módulos. */

export const root = document.documentElement;

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/** localStorage que não quebra o site em modo privado ou com o armazenamento bloqueado. */
export const storage = {
  get(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, value); } catch { /* armazenamento indisponível */ }
  },
};

/**
 * Envolve cada palavra de um elemento em uma máscara (`.w > span`) para animar a entrada.
 * Elementos filhos (como <em>) contam como uma palavra só.
 */
export function splitWords(el) {
  let index = 0;
  const wrap = (node) => {
    const mask = document.createElement("span");
    mask.className = "w";
    const inner = document.createElement("span");
    inner.style.setProperty("--i", index++);
    inner.appendChild(node);
    mask.appendChild(inner);
    return mask;
  };

  [...el.childNodes].forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const fragment = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        fragment.appendChild(/^\s+$/.test(part) ? document.createTextNode(" ") : wrap(document.createTextNode(part)));
      });
      el.replaceChild(fragment, node);
    } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== "BR") {
      el.replaceChild(wrap(node.cloneNode(true)), node);
    }
  });
}
