/**
 * Roadmap: a navegação do site é uma estrada em serpentina, com uma parada por seção.
 *
 * - A curva é gerada a partir do tamanho da barra lateral (vertical no desktop,
 *   horizontal no celular), e as paradas são posicionadas sobre ela.
 * - Ao rolar, o Chevettinho anda pela curva acompanhando a leitura e vira nas curvas.
 * - Ao clicar numa parada (ou em qualquer link interno), a câmera "sobe": a página
 *   vira um mapa do site inteiro, o carro dirige até o destino e a câmera desce nele.
 * - Viagens longas (3 trechos ou mais) entram no modo turbo: o carro arranca, um mostrador
 *   conta a velocidade (×1 → ×10) e ele freia perto do destino. Um clique, toque ou Esc
 *   durante a viagem pula direto para a chegada.
 */
import { EVENTS, STOPS, STOP_LABEL_KEYS } from "../core/config.js";
import { offsetOf, jumpTo } from "../core/scroll.js";
import { clamp, sleep } from "../core/utils.js";
import { t } from "../i18n/index.js";

const ODOMETER_KM = 42;           // a viagem inteira, do início ao contato
const isHorizontal = () => window.matchMedia("(max-width: 720px)").matches;
const lerp = (a, b, k) => a + (b - a) * k;
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeInOutSpeed = (x) => (x < 0.5 ? 12 * x * x : 3 * (2 - 2 * x) ** 2); // derivada da easeInOut
const linear = (x) => x;
const CRUISE_MS = 1300;           // velocidade "×1": um trecho entre paradas vizinhas em 1,3 s
const TURBO_LEGS = 3;             // a partir de quantos trechos a viagem entra no modo turbo

/** Comprimento ao longo de um path mais próximo de um ponto (amostragem simples). */
function lengthNearest(path, x, y, step = 1.5) {
  const total = path.getTotalLength();
  let best = 0, bestDist = Infinity;
  for (let l = 0; l <= total; l += step) {
    const p = path.getPointAtLength(l);
    const d = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (d < bestDist) { bestDist = d; best = l; }
  }
  return best;
}

/** Ponto e ângulo (em graus, com a frente do carro apontando para o sentido da viagem). */
function poseAt(path, length, direction) {
  const total = path.getTotalLength();
  const l = clamp(length, 0, total);
  const p = path.getPointAtLength(l);
  const ahead = path.getPointAtLength(clamp(l + 1, 0, total));
  const behind = path.getPointAtLength(clamp(l - 1, 0, total));
  const angle = (Math.atan2(ahead.y - behind.y, ahead.x - behind.x) * 180) / Math.PI + 90;
  return { x: p.x, y: p.y, angle: direction < 0 ? angle + 180 : angle };
}

/** Monta um "S" suave passando por todos os pontos, com tangentes ao longo do eixo da estrada. */
function serpentine(points, horizontal) {
  let d = `M${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const k = 0.62;
    const c1 = horizontal ? [a.x + (b.x - a.x) * k, a.y] : [a.x, a.y + (b.y - a.y) * k];
    const c2 = horizontal ? [b.x - (b.x - a.x) * k, b.y] : [b.x, b.y - (b.y - a.y) * k];
    d += ` C${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${b.x} ${b.y}`;
  }
  return d;
}

export function initRoadmap() {
  const route = document.getElementById("route");
  const svg = document.getElementById("road-svg");
  const roadPath = document.getElementById("road-path");
  const donePath = document.getElementById("road-done");
  const lanePath = document.getElementById("road-lane");
  const car = document.getElementById("map-car");
  const stops = [...route.querySelectorAll(".map__stop")];
  const odometer = document.getElementById("odo");
  const scenery = [document.querySelector("main"), document.querySelector(".footer")];

  const atlas = {
    root: document.getElementById("atlas"),
    world: document.getElementById("atlas-world"),
    road: document.getElementById("atlas-road"),
    done: document.getElementById("atlas-done"),
    car: document.getElementById("atlas-car"),
    dest: document.getElementById("atlas-dest"),
    speed: document.getElementById("atlas-speed"),
    cities: [...document.querySelectorAll(".atlas__city")],
  };

  let stopLen = [];      // comprimento da estrada em cada parada
  let roadLen = 1;
  let carLen = 0;        // posição atual do carro ao longo da estrada
  let carDir = 1;        // 1 = indo para a próxima seção, -1 = voltando
  let activeIndex = 0;
  let travelling = false;
  let skipping = false;  // o visitante pediu para pular a viagem

  /* ---------- geometria da estrada lateral ---------- */

  function layout() {
    const horizontal = isHorizontal();
    const w = route.clientWidth, h = route.clientHeight;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);

    // posições das paradas: ao longo do eixo da estrada, alternando de um lado para o outro
    const pad = horizontal ? 22 : 18;
    const along = horizontal ? w : h;
    const lanes = horizontal ? [h * 0.3, h * 0.7] : w > 120 ? [30, 76] : [w * 0.32, w * 0.68];
    const points = stops.map((_, i) => {
      const main = pad + (i * (along - pad * 2)) / (stops.length - 1);
      const cross = lanes[i % 2];
      return horizontal ? { x: main, y: cross } : { x: cross, y: main };
    });

    const d = serpentine(points, horizontal);
    [roadPath, donePath, lanePath].forEach((p) => p.setAttribute("d", d));
    roadLen = roadPath.getTotalLength();
    stopLen = points.map((p) => lengthNearest(roadPath, p.x, p.y));
    donePath.style.strokeDasharray = `${roadLen} ${roadLen}`;

    stops.forEach((stop, i) => {
      const li = stop.parentElement;
      li.style.setProperty("--y", `${points[i].y}px`);
      li.style.setProperty("--x", `${points[i].x}px`);
    });
  }

  function placeCar(length) {
    if (length !== carLen) carDir = Math.sign(length - carLen) || carDir;
    carLen = length;
    const pose = poseAt(roadPath, length, carDir);
    route.style.setProperty("--car-x", `${pose.x}px`);
    route.style.setProperty("--car-y", `${pose.y}px`);
    route.style.setProperty("--car-rot", `${pose.angle}deg`);
    donePath.style.strokeDashoffset = `${roadLen - length}`;
    const span = stopLen.at(-1) - stopLen[0] || 1;
    const km = Math.round(clamp((length - stopLen[0]) / span, 0, 1) * ODOMETER_KM);
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

  /** Converte a rolagem em posição na estrada: entre duas seções, o carro fica entre duas paradas. */
  function positionFromScroll() {
    const y = window.scrollY;
    const marks = STOPS.map(offsetOf);
    let index = 0;
    for (let i = 0; i < marks.length; i++) if (y >= marks[i] - 2) index = i;
    if (index === marks.length - 1) return { length: stopLen[index], index };
    const k = clamp((y - marks[index]) / (marks[index + 1] - marks[index] || 1), 0, 1);
    return { length: lerp(stopLen[index], stopLen[index + 1], k), index: k > 0.6 ? index + 1 : index };
  }

  let queued = false;
  function syncWithScroll() {
    if (travelling || queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      if (travelling) return;
      const { length, index } = positionFromScroll();
      placeCar(length);
      if (index !== activeIndex) markStop(index);
    });
  }

  /* ---------- transição: o mapa visto de cima ---------- */

  // posições das cidades e comprimentos no mapa grande (fixos, medidos uma vez)
  const cityPos = atlas.cities.map((g) => {
    const [, x, y] = g.getAttribute("transform").match(/translate\(([\d.]+) ([\d.]+)\)/).map(Number);
    return { x, y };
  });
  const atlasLen = atlas.road.getTotalLength();
  const cityLen = cityPos.map((c) => lengthNearest(atlas.road, c.x, c.y, 2));
  atlas.done.style.strokeDasharray = `${atlasLen} ${atlasLen}`;

  const camera = ({ x, y, scale }) => `translate(${500 - scale * x}px, ${300 - scale * y}px) scale(${scale})`;
  const mixShot = (a, b, k) => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), scale: a.scale * Math.pow(b.scale / a.scale, k) });

  function placeAtlasCar(length, direction) {
    const pose = poseAt(atlas.road, length, direction);
    atlas.car.setAttribute("transform", `translate(${pose.x} ${pose.y}) rotate(${pose.angle}) scale(1.5)`);
    atlas.done.style.strokeDashoffset = `${atlasLen - length}`;
  }

  /**
   * Os "palcos" da viagem. Os dois têm os mesmos passos, e quem dita o tempo é o flyOver:
   * start (perto da origem) → rise (câmera sobe) → drive (carro anda) → dive (mergulha no destino).
   */
  const svgStage = {
    start(from, to, length, direction) {
      atlas.cities.forEach((g, i) => {
        g.classList.toggle("is-from", i === from);
        g.classList.toggle("is-to", i === to);
      });
      this.trip = { direction, start: { ...cityPos[from], scale: 2.8 }, overview: { x: 500, y: 300, scale: 1 }, end: { ...cityPos[to], scale: 3.4 } };
      placeAtlasCar(length, direction);
      atlas.world.style.transform = camera(this.trip.start);
    },
    rise(k) { atlas.world.style.transform = camera(mixShot(this.trip.start, this.trip.overview, k)); },
    drive(k, length) { placeAtlasCar(length, this.trip.direction); }, // no SVG, o turbo é só o mostrador
    dive(k) { atlas.world.style.transform = camera(mixShot(this.trip.overview, this.trip.end, k)); },
  };

  // o diorama 3D carrega em segundo plano depois da abertura; sem WebGL, fica o mapa em SVG
  let stage = svgStage;
  const load3D = () => import("./atlas3d.js")
    .then(({ createAtlas3D }) => createAtlas3D({
      root: atlas.root, road: atlas.road, cities: cityPos, cityLen,
      labels: [...atlas.root.querySelectorAll(".atlas__label")],
    }))
    .then((view) => {
      if (!view) return;
      stage = view;
      atlas.root.classList.add("atlas--3d");
    })
    .catch((err) => console.warn("atlas 3D indisponível, usando o mapa em SVG:", err));
  // espera a abertura terminar para não disputar o processador com ela
  setTimeout(() => {
    if ("requestIdleCallback" in window) requestIdleCallback(load3D, { timeout: 3000 });
    else load3D();
  }, 3000);

  /**
   * Anima um valor pelo relógio (não trava se o navegador pausar a renderização).
   * Se o visitante pedir para pular, salta direto para o fim.
   */
  function tween(duration, onFrame, ease = easeInOut) {
    const startedAt = performance.now();
    return new Promise((resolve) => {
      const tick = () => {
        const k = skipping ? 1 : Math.min(1, (performance.now() - startedAt) / duration);
        onFrame(ease(k), k * duration);
        if (k < 1) setTimeout(tick, 16);
        else resolve();
      };
      tick();
    });
  }

  const animateScenery = (keyframes, options) =>
    Promise.all(scenery.map((el) => el.animate(keyframes, { ...options, fill: "forwards" }).finished));

  let shownSpeed = 0;
  function showSpeed(ratio) {
    const x = Math.round(clamp(ratio, 1, 10));
    if (x !== shownSpeed) atlas.speed.textContent = "×" + (shownSpeed = x);
  }

  async function flyOver(fromIndex, toIndex, targetY) {
    const direction = Math.sign(toIndex - fromIndex) || 1;
    const is3D = stage !== svgStage;
    const view = stage; // fixa o palco durante a viagem, mesmo que o 3D termine de carregar no meio
    const legs = Math.max(1, Math.abs(toIndex - fromIndex));
    const turbo = legs >= TURBO_LEGS;

    // a duração cresce pouco com a distância: 1 trecho ≈ 0,65 s, 4 trechos ≈ 1,2 s
    const riseMs = is3D ? 700 : 600;
    const driveMs = is3D ? 650 + 170 * (legs - 1) : 600 + 150 * (legs - 1);
    const leadMs = riseMs * 0.5; // o carro arranca enquanto a câmera ainda sobe

    // 1. a página se afasta e o mapa aparece, ainda bem perto da cidade de origem
    atlas.root.classList.add("is-on");
    atlas.root.classList.toggle("is-turbo", turbo);
    showSpeed(1);
    view.start(fromIndex, toIndex, cityLen[fromIndex], direction);
    await Promise.all([
      animateScenery([{ transform: "scale(1)", opacity: 1 }, { transform: "scale(.94)", opacity: 0 }],
        { duration: 380, easing: "cubic-bezier(.5,0,.75,0)" }),
      atlas.root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 380, fill: "forwards" }).finished,
    ]);

    // 2. a câmera sobe e, no meio da subida, o carro arranca até o destino
    //    (no mapa grande e na estrada lateral ao mesmo tempo)
    const sideFrom = carLen, sideTo = stopLen[toIndex];
    const mapFrom = cityLen[fromIndex], mapTo = cityLen[toIndex];
    await tween(leadMs + driveMs, (_, ms) => {
      const x = clamp((ms - leadMs) / driveMs, 0, 1);
      const kd = easeInOut(x);
      // velocidade de agora em relação ao cruzeiro: o carro arranca, passa de ×10 e freia
      const ratio = skipping ? 1 : (legs * CRUISE_MS * easeInOutSpeed(x)) / driveMs;
      const boost = turbo && !skipping ? clamp((ratio - 2) / 6, 0, 1) : 0;
      if (turbo) showSpeed(ratio);
      view.rise(easeInOut(clamp(ms / riseMs, 0, 1)));
      view.drive(kd, lerp(mapFrom, mapTo, kd), boost);
      placeCar(lerp(sideFrom, sideTo, kd));
    }, linear);
    jumpTo(targetY); // a página troca de seção escondida embaixo do mapa
    atlas.root.classList.remove("is-turbo");
    skipping = false; // a chegada sempre acontece inteira

    // 3. a câmera desce no destino e a seção nova aparece
    const dive = tween(is3D ? 800 : 700, (k) => view.dive(k));
    await sleep(is3D ? 440 : 380);
    await Promise.all([
      atlas.root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 360, fill: "forwards" }).finished,
      animateScenery([{ transform: "scale(1.05)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }],
        { duration: 520, easing: "cubic-bezier(.2,.8,.2,1)" }),
      dive,
    ]);

    scenery.forEach((el) => el.getAnimations().forEach((a) => a.cancel()));
    atlas.root.getAnimations().forEach((a) => a.cancel());
    atlas.root.classList.remove("is-on");
  }

  /** Leva o carro (e a página) até uma parada. Devolve quando ele chega. */
  async function travelTo(selector) {
    const index = STOPS.indexOf(selector);
    if (index < 0 || travelling) return;
    if (index === activeIndex && Math.abs(window.scrollY - offsetOf(selector)) < 4) return;
    travelling = true;
    skipping = false;

    const from = activeIndex;
    document.dispatchEvent(new CustomEvent(EVENTS.depart, { detail: { index, from } }));
    atlas.dest.textContent = t(STOP_LABEL_KEYS[index]);
    car.classList.add("is-driving");

    // a viagem só acontece quando o visitante pede (clique), nunca sozinha
    await flyOver(from, index, offsetOf(selector));

    car.classList.remove("is-driving");
    placeCar(stopLen[index]);
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

  // durante a viagem, um clique, toque ou Esc pula direto para a chegada
  const skip = (e) => {
    if (!travelling || skipping) return;
    if (e.type === "keydown" && !["Escape", "Enter", " "].includes(e.key)) return;
    skipping = true;
  };
  document.addEventListener("pointerdown", skip);
  document.addEventListener("keydown", skip);

  window.addEventListener("scroll", syncWithScroll, { passive: true });
  window.addEventListener("resize", () => { layout(); placeCar(carLen); syncWithScroll(); });

  layout();
  markStop(0);
  placeCar(stopLen[0]);

  return {
    travelTo,
    isTravelling: () => travelling,
    carElement: car,
  };
}

