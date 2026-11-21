/**
 * Chevettinho: o mascote-guia do site.
 *
 * - Chega dirigindo e estaciona no canto da tela.
 * - Faz um tour roteirizado pelas seções: a cada parada ele atravessa a tela
 *   enquanto a página rola, mostra a placa do destino, dá meia-volta e estaciona.
 * - Depois do tour, responde a perguntas prontas (sem IA, sem custo, sem backend).
 */
import { EVENTS, STORAGE_KEYS } from "../core/config.js";
import { scrollToY, offsetOf } from "../core/scroll.js";
import { sleep, storage, clamp } from "../core/utils.js";
import { t } from "../i18n/index.js";

const TOUR_TARGETS = ["#top", "#sobre", "#stack", "#projetos", "#contato"];
const SECTION_LABEL_KEYS = { "#sobre": "nav.about", "#stack": "nav.stack", "#projetos": "nav.projects", "#contato": "nav.contact" };
const FACE_LEFT = "scaleX(-1)"; // o desenho de perfil olha para a direita; espelhado, anda para a esquerda
const HONK_INTERVAL = 16000;

export function initChevettinho() {
  const el = {
    wrap: document.getElementById("buddy"),
    bubble: document.getElementById("buddy-bubble"),
    text: document.getElementById("buddy-text"),
    step: document.getElementById("buddy-step"),
    actions: document.getElementById("buddy-actions"),
    car: document.getElementById("buddy-car"),
    drive: document.getElementById("buddy-drive"),
    shout: document.getElementById("buddy-vrum"),
    close: document.getElementById("buddy-close"),
    road: document.getElementById("road"),
    sign: document.getElementById("road-sign"),
    signText: document.getElementById("road-sign-text"),
    warp: document.getElementById("warp"),
  };
  const pupils = el.car.querySelectorAll(".car__pupil, .car__pupil-shine");
  const progress = document.createElement("div");
  progress.className = "buddy__progress";
  el.text.after(progress);

  const state = { mode: null, step: 0, lastAnswer: null, busy: false, typer: null };
  const labelOf = (selector) => (SECTION_LABEL_KEYS[selector] ? `./${t(SECTION_LABEL_KEYS[selector])}` : "~/");

  /* ---------- animações do carro ---------- */

  function shout(word) {
    el.shout.textContent = word;
    el.shout.classList.remove("is-on");
    void el.shout.offsetWidth; // reinicia a animação CSS
    el.shout.classList.add("is-on");
  }

  const popParked = () => el.car.animate(
    [{ transform: "scale(.86) translateY(4px)" }, { transform: "scale(1.06)" }, { transform: "none" }],
    { duration: 400, easing: "ease-out" },
  );

  /** Entrada: vem dirigindo da esquerda e estaciona no canto. */
  async function arrive() {
    const from = -(el.drive.getBoundingClientRect().right + 20);
    el.road.classList.add("is-on");
    el.wrap.classList.add("is-driving");
    await el.drive.animate([
      { transform: `translateX(${from}px)` },
      { transform: "translateX(14px) rotate(-3deg)", offset: 0.86 }, // passa um pouco e freia
      { transform: "translateX(0)" },
    ], { duration: 1700, easing: "cubic-bezier(.25,.6,.3,1)" }).finished;
    el.road.classList.remove("is-on");
    el.wrap.classList.remove("is-driving");
    shout("bi-bi!");
    popParked();
  }

  /** Viagem até uma seção: atravessa a tela junto com a rolagem, mostra a placa, dá meia-volta e estaciona. */
  async function travel(selector) {
    state.busy = true;
    const targetY = offsetOf(selector);
    shout("vrum!");
    await el.car.animate(
      [{ transform: "none" }, { transform: "translateY(-10px) rotate(-5deg)" }, { transform: "none" }],
      { duration: 300, easing: "ease-out" },
    ).finished;

    const distance = el.drive.getBoundingClientRect().left - 12;
    const at = (x, extra = "") => ({ transform: `translateX(${x}px) ${extra}` });
    el.signText.textContent = labelOf(selector);
    el.road.classList.add("is-on");
    el.wrap.classList.add("is-driving");
    el.warp.classList.toggle("is-up", targetY < window.scrollY);
    el.warp.classList.add("is-on");

    // ida: atravessa a tela para a esquerda enquanto a página rola
    await Promise.all([
      el.drive.animate([
        at(0, FACE_LEFT),
        { ...at(8, `${FACE_LEFT} rotate(-2deg)`), offset: 0.08 }, // arranca
        at(-distance, FACE_LEFT),
      ], { duration: 1400, easing: "cubic-bezier(.45,0,.3,1)", fill: "forwards" }).finished,
      scrollToY(targetY, 1400),
    ]);
    el.warp.classList.remove("is-on");

    // freia e mostra a placa do destino
    el.sign.classList.add("is-on");
    await el.drive.animate([
      at(-distance, FACE_LEFT),
      at(-distance - 10, `${FACE_LEFT} rotate(4deg)`),
      at(-distance, FACE_LEFT),
    ], { duration: 360, easing: "ease-out", fill: "forwards" }).finished;
    await sleep(380);

    // meia-volta
    await el.drive.animate([
      at(-distance, "scaleX(-1)"),
      at(-distance, "scaleX(.05) scaleY(1.08)"),
      at(-distance, "scaleX(1)"),
    ], { duration: 300, easing: "ease-in-out", fill: "forwards" }).finished;

    // volta para a vaga
    setTimeout(() => el.sign.classList.remove("is-on"), 250);
    await el.drive.animate([
      at(-distance),
      { ...at(12, "rotate(-3deg)"), offset: 0.86 },
      at(0),
    ], { duration: 1050, easing: "cubic-bezier(.3,.6,.3,1)", fill: "forwards" }).finished;

    el.drive.getAnimations().forEach((animation) => animation.cancel());
    el.road.classList.remove("is-on");
    el.wrap.classList.remove("is-driving");
    popParked();
    state.busy = false;
  }

  function focusSection(selector) {
    document.querySelectorAll(".tour-focus").forEach((s) => s.classList.remove("tour-focus"));
    document.querySelector(selector)?.classList.add("tour-focus");
  }

  /* ---------- balão de fala ---------- */

  function type(message) {
    clearInterval(state.typer);
    el.wrap.classList.add("is-talking");
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
        el.wrap.classList.remove("is-talking");
      }
    }, 18);
  }

  function button(label, onClick, primary = false) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `buddy__btn${primary ? " buddy__btn--primary" : ""}`;
    b.textContent = label;
    b.addEventListener("click", () => { if (!state.busy) onClick(); });
    return b;
  }

  function showBubble() {
    el.bubble.hidden = false;
    el.bubble.style.animation = "none";
    void el.bubble.offsetWidth;
    el.bubble.style.animation = "";
  }

  function hideBubble() {
    el.bubble.hidden = true;
    clearInterval(state.typer);
    el.wrap.classList.remove("is-talking");
  }

  function close() {
    hideBubble();
    state.mode = null;
    document.querySelectorAll(".tour-focus").forEach((s) => s.classList.remove("tour-focus"));
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
    hideBubble();
    state.step = step;
    focusSection(TOUR_TARGETS[step]);
    await travel(TOUR_TARGETS[step]);
    renderTour();
  }

  /* ---------- perguntas prontas ---------- */

  function renderChat(answerIndex = null) {
    state.mode = "chat";
    state.lastAnswer = answerIndex;
    el.step.textContent = "";
    progress.hidden = true;

    el.actions.className = "buddy__actions buddy__actions--chips";
    el.actions.replaceChildren(...t("buddy.q").map(([question, , target], index) =>
      button(question, async () => {
        if (target === "tour") { goToStep(0); return; }
        hideBubble();
        focusSection(target);
        await travel(target);
        renderChat(index);
      }),
    ));

    showBubble();
    type(answerIndex === null ? t("buddy.hello") : t("buddy.q")[answerIndex][1]);
  }

  /* ---------- eventos ---------- */

  el.car.addEventListener("click", () => {
    if (state.busy) return;
    if (el.bubble.hidden) renderChat();
    else close();
  });
  el.close.addEventListener("click", close);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !el.bubble.hidden) close(); });

  // ao trocar de idioma, o balão aberto é redesenhado no idioma novo
  document.addEventListener(EVENTS.langChange, () => {
    if (el.bubble.hidden) return;
    if (state.mode === "tour") renderTour();
    else if (state.mode === "chat") renderChat(state.lastAnswer);
  });

  // os faróis (olhos) seguem o cursor
  window.addEventListener("pointermove", (e) => {
    const rect = el.car.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    const length = Math.hypot(dx, dy) || 1;
    const reach = Math.min(1, length / 300) * 4;
    pupils.forEach((p) => { p.style.transform = `translate(${(dx / length) * reach}px, ${(dy / length) * reach}px)`; });
  });

  // inclina conforme a velocidade da rolagem
  let lastY = window.scrollY, leanReset = null;
  window.addEventListener("scroll", () => {
    if (state.busy) return;
    const delta = window.scrollY - lastY;
    lastY = window.scrollY;
    el.car.style.setProperty("--lean", `${clamp(delta * 0.35, -8, 8)}deg`);
    clearTimeout(leanReset);
    leanReset = setTimeout(() => el.car.style.setProperty("--lean", "0deg"), 140);
  }, { passive: true });

  // de vez em quando ele buzina para chamar atenção
  setInterval(() => {
    if (state.busy || !el.bubble.hidden || document.hidden || !el.wrap.classList.contains("is-ready")) return;
    el.wrap.classList.add("is-honk");
    shout("bi-bi!");
    setTimeout(() => el.wrap.classList.remove("is-honk"), 950);
  }, HONK_INTERVAL);

  /** Começa a apresentação: chega dirigindo e, na primeira visita, oferece o tour. */
  return async function start() {
    await arrive();
    el.wrap.classList.add("is-ready");
    if (storage.get(STORAGE_KEYS.tourDone)) return;
    await sleep(600);
    if (el.bubble.hidden) {
      state.step = 0;
      renderTour();
    }
  };
}
