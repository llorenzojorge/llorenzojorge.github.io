/**
 * Chevettinho: o mascote-guia, que mora na estrada do minimapa.
 *
 * - Na primeira visita, chega na estrada e oferece um tour pelas paradas.
 * - Nas visitas seguintes, dá um "de volta" curto (uma vez por sessão) com as perguntas prontas.
 * - Cada "próxima parada" é uma viagem de verdade pelo roadmap.
 * - Depois do tour, responde a perguntas prontas (sem IA, sem custo, sem backend).
 */
import { EVENTS, STOPS, STORAGE_KEYS } from "../core/config.js";
import { sleep, storage } from "../core/utils.js";
import { t } from "../i18n/index.js";

export function initChevettinho(roadmap) {
  const el = {
    car: roadmap.carElement,
    button: document.getElementById("buddy-car"),
    shout: document.getElementById("car-shout"),
    bubble: document.getElementById("buddy-bubble"),
    text: document.getElementById("buddy-text"),
    step: document.getElementById("buddy-step"),
    actions: document.getElementById("buddy-actions"),
    close: document.getElementById("buddy-close"),
  };
  const progress = document.createElement("div");
  progress.className = "buddy__progress";
  el.text.after(progress);

  const state = { mode: null, step: 0, lastAnswer: null, greeting: "buddy.hello", typer: null };

  /* ---------- o carro ---------- */

  function shout(word) {
    el.shout.textContent = word;
    el.shout.classList.remove("is-on");
    void el.shout.offsetWidth; // reinicia a animação CSS
    el.shout.classList.add("is-on");
  }

  document.addEventListener(EVENTS.depart, () => {
    hideBubble();
    shout("vrum!");
  });

  /* ---------- balão de fala ---------- */

  /** Posiciona o balão ao lado do carro (ou acima dele, no celular). */
  function placeBubble() {
    if (el.bubble.hidden) return;
    const car = el.car.getBoundingClientRect();
    el.bubble.style.setProperty("--bubble-y", `${car.top - 8}px`);
    const bubble = el.bubble.getBoundingClientRect();
    el.bubble.style.setProperty("--tip-x", `${car.left + car.width / 2 - bubble.left}px`);
  }

  function type(message) {
    clearInterval(state.typer);
    el.bubble.classList.add("is-talking");
    el.text.innerHTML = '<span class="typing-caret"></span>';
    const caret = el.text.firstChild;
    const node = document.createTextNode("");
    el.text.insertBefore(node, caret);
    let i = 0;
    state.typer = setInterval(() => {
      i += 2;
      node.textContent = message.slice(0, i);
      if (i >= message.length) {
        clearInterval(state.typer);
        caret.remove();
        el.bubble.classList.remove("is-talking");
      }
    }, 18);
  }

  function button(label, onClick, primary = false) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `buddy__btn${primary ? " buddy__btn--primary" : ""}`;
    b.textContent = label;
    b.addEventListener("click", () => { if (!roadmap.isTravelling()) onClick(); });
    return b;
  }

  function showBubble() {
    el.bubble.hidden = false;
    el.bubble.style.animation = "none";
    void el.bubble.offsetWidth;
    el.bubble.style.animation = "";
    placeBubble();
  }

  function hideBubble() {
    el.bubble.hidden = true;
    clearInterval(state.typer);
    el.bubble.classList.remove("is-talking");
  }

  function close() {
    hideBubble();
    state.mode = null;
    storage.set(STORAGE_KEYS.tourDone, "1");
  }

  /* ---------- tour ---------- */

  function renderTour() {
    state.mode = "tour";
    const steps = t("buddy.steps");
    const last = state.step === steps.length - 1;

    el.step.textContent = `· ${t("buddy.tour")} ${state.step + 1}/${steps.length}`;
    progress.hidden = false;
    progress.replaceChildren(...steps.map((_, i) => {
      const dot = document.createElement("span");
      if (i <= state.step) dot.className = "is-on";
      return dot;
    }));

    el.actions.className = "buddy__actions";
    el.actions.replaceChildren();
    if (!last) el.actions.append(button(t("buddy.skip"), close));
    el.actions.append(button(
      state.step === 0 ? t("buddy.start") : last ? t("buddy.end") : t("buddy.next"),
      () => (last ? close() : goToStep(state.step + 1)),
      true,
    ));

    showBubble();
    type(steps[state.step]);
  }

  async function goToStep(step) {
    state.step = step;
    await roadmap.travelTo(STOPS[step]);
    renderTour();
  }

  /* ---------- perguntas prontas ---------- */

  function renderChat(answerIndex = null, greeting = "buddy.hello") {
    state.mode = "chat";
    state.lastAnswer = answerIndex;
    state.greeting = greeting;
    el.step.textContent = "";
    progress.hidden = true;

    el.actions.className = "buddy__actions buddy__actions--chips";
    el.actions.replaceChildren(...t("buddy.q").map(([question, , target], index) =>
      button(question, async () => {
        if (target === "tour") { state.step = 0; await roadmap.travelTo(STOPS[0]); renderTour(); return; }
        await roadmap.travelTo(target);
        renderChat(index);
      }),
    ));

    showBubble();
    type(answerIndex === null ? t(greeting) : t("buddy.q")[answerIndex][1]);
  }

  /* ---------- eventos ---------- */

  el.button.addEventListener("click", () => {
    if (roadmap.isTravelling()) return;
    if (el.bubble.hidden) renderChat();
    else close();
  });
  el.close.addEventListener("click", close);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !el.bubble.hidden) close(); });
  window.addEventListener("scroll", placeBubble, { passive: true });
  window.addEventListener("resize", placeBubble);

  // ao trocar de idioma, o balão aberto é redesenhado no idioma novo
  document.addEventListener(EVENTS.langChange, () => {
    if (el.bubble.hidden) return;
    if (state.mode === "tour") renderTour();
    else if (state.mode === "chat") renderChat(state.lastAnswer, state.greeting);
  });

  /** Já deu o "de volta" nesta aba? Recarregar a página não repete a saudação. */
  const greeted = () => { try { return sessionStorage.getItem(STORAGE_KEYS.greeted); } catch { return "1"; } };
  const markGreeted = () => { try { sessionStorage.setItem(STORAGE_KEYS.greeted, "1"); } catch { /* indisponível */ } };

  /** Apresentação: o carro cai na estrada, buzina e cumprimenta: tour na primeira visita, "de volta" nas outras. */
  return async function start() {
    // anima o botão interno: o contêiner guarda a posição do carro na estrada
    await el.button.animate(
      [{ transform: "translateY(-60px)", opacity: 0 }, { offset: 0.7, opacity: 1 }, { transform: "none", opacity: 1 }],
      { duration: 700, easing: "cubic-bezier(.3,1.4,.5,1)" },
    ).finished;
    shout("bi-bi!");
    const returning = storage.get(STORAGE_KEYS.tourDone);
    if (returning && greeted()) return;
    await sleep(700);
    if (!el.bubble.hidden || roadmap.isTravelling()) return;
    if (returning) { markGreeted(); renderChat(null, "buddy.back"); return; }
    state.step = 0;
    renderTour();
  };
}
