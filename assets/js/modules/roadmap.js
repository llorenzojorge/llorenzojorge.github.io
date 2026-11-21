/**
 * Roadmap: a navegação do site é uma estrada com uma parada por seção.
 *
 * - Ao rolar, o Chevettinho anda pela estrada acompanhando a leitura.
 * - Ao clicar numa parada (ou em qualquer link interno), a página desliza
 *   para a esquerda como se a câmera seguisse o carro, uma placa com o
 *   destino cruza a tela e a seção nova entra pela direita.
 */
import { EVENTS, STOPS, STOP_LABEL_KEYS } from "../core/config.js";
import { offsetOf, jumpTo } from "../core/scroll.js";
import { clamp, sleep } from "../core/utils.js";
import { t } from "../i18n/index.js";

const ODOMETER_KM = 42; // a viagem inteira, do início ao contato
const isHorizontal = () => window.matchMedia("(max-width: 720px)").matches;
const lerp = (a, b, k) => a + (b - a) * k;
const easeRoad = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

export function initRoadmap() {
  const route = document.getElementById("route");
  const car = document.getElementById("map-car");
  const stops = [...route.querySelectorAll(".map__stop")];
  const odometer = document.getElementById("odo");
  const shift = document.getElementById("shift");
  const shiftRoad = shift.querySelector(".shift__road");
  const shiftSign = shift.querySelector(".shift__sign");
  const shiftTitle = document.getElementById("shift-title");
  const shiftNum = document.getElementById("shift-num");
  const scenery = [document.querySelector("main"), document.querySelector(".footer")];

  let stopPos = [];     // posição de cada parada ao longo da estrada (px)
  let carPos = 0;       // posição atual do carro (px)
  let activeIndex = 0;
  let travelling = false;

  /* ---------- medidas e posição ---------- */

  function measure() {
    const box = route.getBoundingClientRect();
    stopPos = stops.map((stop) => {
      const dot = stop.querySelector(".map__dot").getBoundingClientRect();
      return isHorizontal() ? dot.left + dot.width / 2 - box.left : dot.top + dot.height / 2 - box.top;
    });
  }

  function placeCar(pos) {
    carPos = pos;
    const horizontal = isHorizontal();
    route.style.setProperty("--car-y", horizontal ? "0px" : `${pos}px`);
    route.style.setProperty("--car-x", horizontal ? `${pos}px` : "0px");
    route.style.setProperty("--travelled", `${Math.max(0, pos)}px`);
    const span = stopPos.at(-1) - stopPos[0] || 1;
    const km = Math.round(clamp((pos - stopPos[0]) / span, 0, 1) * ODOMETER_KM);
    odometer.textContent = `${String(km).padStart(3, "0")} km`;
  }

  function markStop(index) {
    activeIndex = index;
    stops.forEach((stop, i) => {
      stop.classList.toggle("is-active", i === index);
      stop.classList.toggle("is-passed", i < index);
      if (i === index) stop.setAttribute("aria-current", "location");
      else stop.removeAttribute("aria-current");
    });
  }

  /** Converte a rolagem atual em posição na estrada: entre duas seções, o carro fica entre duas paradas. */
  function positionFromScroll() {
    const y = window.scrollY;
    const marks = STOPS.map(offsetOf);
    let index = 0;
    for (let i = 0; i < marks.length; i++) if (y >= marks[i] - 2) index = i;
    if (index === marks.length - 1) return { pos: stopPos[index], index };
    const span = marks[index + 1] - marks[index] || 1;
    const k = clamp((y - marks[index]) / span, 0, 1);
    return { pos: lerp(stopPos[index], stopPos[index + 1], k), index: k > 0.6 ? index + 1 : index };
  }

  let queued = false;
  function syncWithScroll() {
    if (travelling || queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      if (travelling) return;
      const { pos, index } = positionFromScroll();
      placeCar(pos);
      if (index !== activeIndex) markStop(index);
    });
  }

  /* ---------- a viagem ---------- */

  function driveCar(to, duration) {
    const from = carPos;
    const startedAt = performance.now();
    return new Promise((resolve) => {
      const tick = () => {
        const k = Math.min(1, (performance.now() - startedAt) / duration);
        placeCar(lerp(from, to, easeRoad(k)));
        if (k < 1) setTimeout(tick, 16); // pelo relógio: não trava se o navegador pausar a renderização
        else resolve();
      };
      tick();
    });
  }

  const animateAll = (keyframes, options) =>
    Promise.all(scenery.map((el) => el.animate(keyframes, { ...options, fill: "forwards" }).finished));

  /** Transição completa: o cenário sai pela esquerda, a placa cruza, o cenário novo entra pela direita. */
  async function rollScenery(targetY) {
    shift.classList.add("is-on");

    await Promise.all([
      animateAll(
        [{ transform: "translateX(0)", opacity: 1 }, { transform: "translateX(-14vw)", opacity: 0 }],
        { duration: 520, easing: "cubic-bezier(.55,0,.75,.2)" },
      ),
      shiftRoad.animate([{ transform: "scaleX(0)", transformOrigin: "right" }, { transform: "scaleX(1)", transformOrigin: "right" }],
        { duration: 480, easing: "cubic-bezier(.3,0,.2,1)", fill: "forwards" }).finished,
      shiftSign.animate([{ transform: "translateX(75vw) rotate(4deg)" }, { transform: "translateX(0) rotate(0)" }],
        { duration: 560, easing: "cubic-bezier(.2,.8,.25,1.08)", fill: "forwards" }).finished,
    ]);

    jumpTo(targetY);
    await sleep(180);

    await Promise.all([
      shiftSign.animate([{ transform: "translateX(0)" }, { transform: "translateX(-75vw) rotate(-4deg)" }],
        { duration: 460, easing: "cubic-bezier(.6,0,.8,.3)", fill: "forwards" }).finished,
      shiftRoad.animate([{ transform: "scaleX(1)", transformOrigin: "left" }, { transform: "scaleX(0)", transformOrigin: "left" }],
        { duration: 460, delay: 80, easing: "cubic-bezier(.6,0,.8,.3)", fill: "forwards" }).finished,
      animateAll(
        [{ transform: "translateX(14vw)", opacity: 0 }, { transform: "translateX(0)", opacity: 1 }],
        { duration: 620, delay: 120, easing: "cubic-bezier(.2,.8,.2,1)" },
      ),
    ]);

    scenery.forEach((el) => el.getAnimations().forEach((a) => a.cancel()));
    [shiftRoad, shiftSign].forEach((el) => el.getAnimations().forEach((a) => a.cancel()));
    shift.classList.remove("is-on");
  }

  /** Leva o carro (e a página) até uma parada. Devolve quando ele chega. */
  async function travelTo(selector) {
    const index = STOPS.indexOf(selector);
    if (index < 0 || travelling) return;
    travelling = true;

    measure();
    const targetY = offsetOf(selector);
    document.dispatchEvent(new CustomEvent(EVENTS.depart, { detail: { index, from: activeIndex } }));
    shiftTitle.textContent = t(STOP_LABEL_KEYS[index]);
    shiftNum.textContent = String(index + 1).padStart(2, "0");
    car.classList.add("is-driving");

    // a viagem só acontece quando o visitante pede (clique), nunca sozinha
    await Promise.all([driveCar(stopPos[index], 1700), rollScenery(targetY)]);

    car.classList.remove("is-driving");
    placeCar(stopPos[index]);
    markStop(index);
    travelling = false;

    // leva o foco do teclado para o título da seção, para quem navega sem mouse
    const heading = document.querySelector(`${selector} h1, ${selector} h2`);
    if (heading) { heading.setAttribute("tabindex", "-1"); heading.focus({ preventScroll: true }); }

    document.dispatchEvent(new CustomEvent(EVENTS.arrive, { detail: { index } }));
  }

  /* ---------- eventos ---------- */

  // todo link interno vira uma viagem
  document.addEventListener("click", (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link || link.classList.contains("skip-link")) return;
    const selector = link.getAttribute("href");
    if (!STOPS.includes(selector)) return;
    e.preventDefault();
    travelTo(selector);
  });

  window.addEventListener("scroll", syncWithScroll, { passive: true });
  window.addEventListener("resize", () => { measure(); syncWithScroll(); });
  document.addEventListener(EVENTS.langChange, () => { measure(); syncWithScroll(); });

  measure();
  markStop(0);
  placeCar(stopPos[0]);

  return {
    travelTo,
    isTravelling: () => travelling,
    carElement: car,
    stopPosition: (i) => stopPos[i],
    placeCar,
    measure,
    sync: syncWithScroll,
  };
}
