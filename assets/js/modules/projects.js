/** Cards de projeto: simulação de requisição → resposta, brilho no cursor e o feed do TaskbarLed. */
import { sleep } from "../core/utils.js";
import { t } from "../i18n/index.js";
import { observe } from "./reveal.js";

const LINE_DELAY = 150;
const RESPONSE_DELAY = 950;
const runs = new WeakMap(); // permite cancelar uma execução quando o replay é clicado no meio

async function playSequence(box) {
  const run = {};
  runs.set(box, run);
  const isCurrent = () => runs.get(box) === run;

  box.querySelectorAll(".seq-wait").forEach((el) => el.remove());
  const lines = [...box.children].filter((el) => !el.classList.contains("replay"));
  lines.forEach((line) => line.classList.remove("is-on"));

  await sleep(350);
  for (const line of lines) {
    if (!isCurrent()) return;

    if (line.hasAttribute("data-wait")) {
      const waiting = document.createElement("p");
      waiting.className = "seq-wait is-on";
      waiting.innerHTML = `<i></i>${t("projects.waiting")}`;
      box.insertBefore(waiting, line);
      await sleep(RESPONSE_DELAY);
      waiting.remove();
      if (!isCurrent()) return;
    }

    line.classList.add("is-on");
    await sleep(line.classList.contains("code__gap") ? 60 : LINE_DELAY);
  }
}

function initSequences() {
  document.querySelectorAll("[data-sequence]").forEach((box) => {
    const replay = document.createElement("button");
    replay.type = "button";
    replay.className = "replay";
    replay.textContent = "↻ replay";
    replay.addEventListener("click", () => playSequence(box));
    box.appendChild(replay);
    observe(box, playSequence);
  });
}

function initSpotlight() {
  document.querySelectorAll(".project").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - rect.left}px`);
      card.style.setProperty("--my", `${e.clientY - rect.top}px`);
    });
  });
}

/** Réplica decorativa do painel do TaskbarLed: digita ações e conta o tempo. */
async function initLedFeed() {
  const text = document.getElementById("led-text");
  const timer = document.getElementById("led-timer");
  const actions = ["editing src/Program.cs", "running dotnet test", 'searching "TaskbarHost"', "reading README.md"];

  let seconds = 134;
  const pad = (n) => String(n).padStart(2, "0");
  setInterval(() => {
    seconds++;
    timer.textContent = `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;
  }, 1000);

  for (let i = 0; ; i = (i + 1) % actions.length) {
    for (let c = 1; c <= actions[i].length; c++) {
      text.textContent = actions[i].slice(0, c);
      await sleep(40);
    }
    await sleep(2000);
  }
}

export function initProjects() {
  initSequences();
  initSpotlight();
  initLedFeed();
}
