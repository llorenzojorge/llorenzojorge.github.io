/** Hero: terminal que digita, inclinação 3D, botões magnéticos e a faixa de stack. */
import { root, sleep } from "../core/utils.js";

/** Digita os comandos do cartão-terminal, um por vez, mostrando a saída de cada um. */
export async function playTerminal() {
  const lines = [...document.querySelectorAll("#term-body > p")];
  await sleep(900);
  for (const line of lines) {
    const typed = line.querySelector("[data-type]");
    if (!typed) {
      line.classList.add("is-on");
      await sleep(260);
      continue;
    }
    const full = typed.dataset.full ?? (typed.dataset.full = typed.textContent);
    typed.textContent = "";
    line.classList.add("is-on");
    for (let i = 1; i <= full.length; i++) {
      typed.textContent = full.slice(0, i);
      await sleep(55);
    }
    await sleep(180);
  }
}

function initTilt(hero, card) {
  hero.addEventListener("pointermove", (e) => {
    if (!root.classList.contains("is-loaded") || e.pointerType !== "mouse") return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - (rect.left + rect.width / 2)) / window.innerWidth;
    const y = (e.clientY - (rect.top + rect.height / 2)) / window.innerHeight;
    card.style.transform = `perspective(900px) rotateY(${x * 14}deg) rotateX(${-y * 12}deg)`;
  });
  hero.addEventListener("pointerleave", () => { card.style.transform = ""; });
}

function initMagnetic() {
  document.querySelectorAll(".magnetic").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      const rect = el.getBoundingClientRect();
      const dx = e.clientX - (rect.left + rect.width / 2);
      const dy = e.clientY - (rect.top + rect.height / 2);
      el.style.transform = `translate(${dx * 0.25}px, ${dy * 0.35}px)`;
    });
    el.addEventListener("pointerleave", () => { el.style.transform = ""; });
  });
}

function initMarquee() {
  // duplica o conteúdo para a animação em loop não ter emenda
  document.querySelectorAll(".marquee__track").forEach((track) => { track.innerHTML += track.innerHTML; });
}

export function initHero() {
  initTilt(document.querySelector(".hero"), document.querySelector(".term.tilt"));
  initMagnetic();
  initMarquee();
}
