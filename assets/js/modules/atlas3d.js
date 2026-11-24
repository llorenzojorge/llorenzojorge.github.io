/**
 * Atlas 3D: o mapa da transição como um diorama noturno (three.js).
 *
 * O site vira uma maquete flutuante: um bloco de terreno recortado, com morros entre
 * as paradas, a estrada seguindo o relevo, postes acesos, prédios com janelas e o
 * Chevettinho com os faróis ligados. A cidade de destino se ilumina na chegada.
 *
 * Fonte única: a estrada e as cidades são lidas do SVG do atlas (`#atlas-road` e
 * `.atlas__city`), o mesmo que serve de reserva quando não há WebGL. Para mudar uma
 * parada, mude o SVG; o diorama se ajusta sozinho.
 *
 * Nada fica animando em loop: a cena só é desenhada quando a viagem pede um quadro.
 * Quem conduz o tempo é o roadmap (pelo relógio), chamando start → rise → drive → dive.
 * rise e drive se sobrepõem (o carro arranca com a câmera ainda subindo) e viram um
 * quadro só. No turbo, drive recebe um "boost" (0 a 1): rastro de luz atrás do carro,
 * postes que se esticam em riscos e a câmera mais perto.
 */
import * as THREE from "../../vendor/three.min.js";
import { buildChevette, CHEVETTE_LENGTH } from "./chevette.js";

const SCALE = 1 / 100;          // 100 unidades do SVG = 1 unidade do mundo
const SAMPLES = 600;            // amostras da estrada
const ROAD_W = 0.22;
const CITY_SCALE = 1.35;
const CAR_LENGTH = 0.5;          // o Chevettinho na escala da maquete

const C = {
  low: "#1f2227", high: "#5d6370",
  bands: [[0.45, "#202227"], [0.85, "#191b1f"], [1.25, "#141518"]],
  asphalt: "#0b0c0e", done: "#161b36", lane: "#eceef1", accent: "#7088ff",
  building: "#2a2d33", buildingLit: "#3d4aa0", window: "#c9d2ff",
  body: "#5a73f0",
};

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (e0, e1, x) => { const t = clamp01((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
const lerp = (a, b, k) => a + (b - a) * k;
const DEG = Math.PI / 180;

/** Números pseudoaleatórios com semente: o diorama sai igual em toda visita. */
function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Textura de brilho (luz de poste), desenhada uma vez num canvas. */
function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.12, "rgba(201,210,255,.9)");
  grad.addColorStop(0.4, "rgba(112,136,255,.3)");
  grad.addColorStop(1, "rgba(112,136,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ---------- relevo ---------- */

function buildTerrainModel(road, cities, cityLen, total) {
  const pts = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const l = (total * i) / SAMPLES;
    const p = road.getPointAtLength(l);
    pts.push({ x: p.x * SCALE, z: p.y * SCALE, l });
  }
  const at = (l) => pts[Math.round(clamp01(l / total) * SAMPLES)];

  const cx = cities.map((c) => c.x * SCALE), cz = cities.map((c) => c.y * SCALE);
  const bounds = {
    x0: Math.min(...cx) - 0.9, x1: Math.max(...cx) + 0.9,
    z0: Math.min(...cz) - 1.0, z1: Math.max(...cz) + 1.4,
  };
  const spanX = bounds.x1 - bounds.x0, spanZ = bounds.z1 - bounds.z0;

  // morros: um em cada trecho entre paradas (a estrada sobe e desce) e outros em volta
  const hills = [];
  for (let i = 0; i < cities.length - 1; i++) {
    const m = at((cityLen[i] + cityLen[i + 1]) / 2);
    hills.push([m.x, m.z, i % 2 ? 0.85 : 1.25, 0.55]);
  }
  [[0.135, -0.15, 1.5, 0.9], [0.448, -0.26, 2.1, 1.2], [0.81, -0.17, 1.8, 1.0], [1.05, 0.07, 1.2, 0.8],
    [0.25, 1.09, 0.5, 0.6], [0.74, 1.11, 0.6, 0.7], [-0.06, 0.41, 0.9, 0.7], [1.08, 0.93, 0.7, 0.6]]
    .forEach(([fx, fz, a, s]) => hills.push([bounds.x0 + fx * spanX, bounds.z0 + fz * spanZ, a, s]));
  hills.push([cx[1], cz[1], 0.5, 0.6]); // "sobre" no alto de um morrinho

  const rawH = (x, z) => {
    let h = 0;
    for (const [hx, hz, a, s] of hills) h += a * Math.exp(-((x - hx) ** 2 + (z - hz) ** 2) / (2 * s * s));
    return h + 0.05 * (Math.sin(x * 2.3 + z * 1.7) + 0.6 * Math.sin(x * 3.9 - z * 2.9));
  };

  // a estrada acompanha o relevo, suavizada para não ter degraus
  pts.forEach((p) => (p.h0 = rawH(p.x, p.z)));
  pts.forEach((p, i) => {
    let s = 0, n = 0;
    for (let k = -10; k <= 10; k++) { const q = pts[i + k]; if (q) { s += q.h0; n++; } }
    p.y = s / n;
  });

  const nearestRoad = (x, z) => {
    let best = pts[0], d = Infinity;
    for (let i = 0; i < pts.length; i += 2) {
      const p = pts[i], dd = (p.x - x) ** 2 + (p.z - z) ** 2;
      if (dd < d) { d = dd; best = p; }
    }
    return [Math.sqrt(d), best];
  };
  const cityH = cx.map((x, i) => nearestRoad(x, cz[i])[1].y);

  // o terreno se aplaina perto da estrada e das cidades
  const height = (x, z) => {
    let h = rawH(x, z);
    const [d, p] = nearestRoad(x, z);
    h = p.y - 0.015 + (h - p.y + 0.015) * smooth(0.15, 0.42, d);
    cx.forEach((x0, i) => {
      const dc = Math.hypot(x - x0, z - cz[i]);
      h = cityH[i] + (h - cityH[i]) * smooth(0.32, 0.62, dc);
    });
    return h;
  };

  return { pts, bounds, height, nearestRoad, cityH, cx, cz };
}

/* ---------- geometria ---------- */

function terrainMesh(model) {
  const { bounds, height } = model;
  const nx = 48, nz = 24, R = rng(7);
  const V = [];
  for (let j = 0; j <= nz; j++) {
    const row = [];
    for (let i = 0; i <= nx; i++) {
      let x = lerp(bounds.x0, bounds.x1, i / nx), z = lerp(bounds.z0, bounds.z1, j / nz);
      if (i > 0 && i < nx && j > 0 && j < nz) {
        x += (R() - 0.5) * 0.5 * (bounds.x1 - bounds.x0) / nx;
        z += (R() - 0.5) * 0.5 * (bounds.z1 - bounds.z0) / nz;
      }
      row.push(new THREE.Vector3(x, height(x, z), z));
    }
    V.push(row);
  }

  const pos = [], col = [];
  const low = new THREE.Color(C.low), high = new THREE.Color(C.high), tmp = new THREE.Color();
  const push = (color, ...vs) => vs.forEach((v) => { pos.push(v.x, v.y, v.z); col.push(color.r, color.g, color.b); });
  const tri = (a, b, c) => { tmp.copy(low).lerp(high, clamp01((a.y + b.y + c.y) / 3 / 2.0)); push(tmp, a, b, c); };
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const a = V[j][i], b = V[j][i + 1], c = V[j + 1][i + 1], d = V[j + 1][i];
    if ((i + j) % 2) { tri(a, c, b); tri(a, d, c); } else { tri(a, d, b); tri(b, d, c); }
  }

  // as paredes do bloco: o solo à mostra em três camadas
  const edges = [];
  for (let i = 0; i < nx; i++) edges.push([V[0][i], V[0][i + 1]], [V[nz][i], V[nz][i + 1]]);
  for (let j = 0; j < nz; j++) edges.push([V[j][0], V[j + 1][0]], [V[j][nx], V[j + 1][nx]]);
  const base = -0.25;
  for (const [a, b] of edges) {
    let ta = a.y, tb = b.y;
    for (const [depth, hex] of C.bands) {
      const y = base - depth, color = new THREE.Color(hex);
      const p = [new THREE.Vector3(a.x, ta, a.z), new THREE.Vector3(b.x, tb, b.z), new THREE.Vector3(b.x, y, b.z), new THREE.Vector3(a.x, y, a.z)];
      push(color, p[0], p[1], p[2], p[0], p[2], p[3]);
      ta = tb = y;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide }));

  // contorno cobalto no alto das paredes
  const rim = [];
  for (let i = 0; i <= nx; i++) rim.push(V[nz][i]);
  for (let j = nz - 1; j >= 0; j--) rim.push(V[j][nx]);
  for (let i = nx - 1; i >= 0; i--) rim.push(V[0][i]);
  for (let j = 1; j <= nz; j++) rim.push(V[j][0]);
  const rimLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(rim.map((v) => new THREE.Vector3(v.x, v.y + 0.006, v.z))),
    new THREE.LineBasicMaterial({ color: C.accent }),
  );

  const corners = [];
  for (const x of [bounds.x0, bounds.x1]) for (const z of [bounds.z0, bounds.z1]) for (const y of [-1.5, 1.6]) corners.push(new THREE.Vector3(x, y, z));
  return { mesh, rimLine, corners };
}

/** Faixa ao longo da estrada (asfalto, trecho rodado, faixa central). */
function ribbon(pts, width, lift, keep = () => true) {
  const pos = [];
  const side = (i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    return [-(b.z - a.z) / len, (b.x - a.x) / len];
  };
  for (let i = 0; i < pts.length - 1; i++) {
    if (!keep(pts[i])) { pos.push(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0); continue; } // mantém o índice = amostra
    const [ax, az] = side(i), [bx, bz] = side(i + 1), p = pts[i], q = pts[i + 1], w = width / 2;
    const v = [
      [p.x - ax * w, p.y + lift, p.z - az * w], [p.x + ax * w, p.y + lift, p.z + az * w],
      [q.x + bx * w, q.y + lift, q.z + bz * w], [q.x - bx * w, q.y + lift, q.z - bz * w],
    ];
    pos.push(...v[0], ...v[2], ...v[1], ...v[0], ...v[3], ...v[2]);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return geo;
}

const flatMat = (color, extra = {}) => new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1, ...extra });

/** Prédios de uma cidade, com janelas. Devolve os materiais para acender a cidade. */
function buildCity(model, index) {
  const group = new THREE.Group();
  const R = rng(11 + index * 31);
  const x0 = model.cx[index], z0 = model.cz[index], y0 = model.cityH[index];
  const wall = new THREE.MeshLambertMaterial({ color: C.building, emissive: C.accent, emissiveIntensity: 0, flatShading: true });
  const glass = new THREE.MeshBasicMaterial({ color: C.window, vertexColors: true });
  const winPos = [], winCol = [];

  const n = 9 + Math.floor(R() * 4);
  for (let k = 0; k < n; k++) {
    const ang = R() * Math.PI * 2, rr = (0.12 + R() * 0.22) * 1.25;
    const x = x0 + Math.cos(ang) * rr, z = z0 + Math.sin(ang) * rr;
    const w = (0.11 + R() * 0.09) * CITY_SCALE, d = (0.11 + R() * 0.08) * CITY_SCALE, h = (0.14 + R() * 0.36) * CITY_SCALE;
    const rot = R() * 0.5;
    if (model.nearestRoad(x, z)[0] < 0.21) continue;

    const box = new THREE.Mesh(new THREE.BoxGeometry(w, h + 0.2, d), wall);
    box.position.set(x, y0 + h / 2 - 0.1, z);
    box.rotation.y = rot;
    group.add(box);

    // janelas nas quatro faces, em coordenadas do mundo
    const cos = Math.cos(rot), sin = Math.sin(rot);
    const toWorld = (lx, ly, lz) => [x + lx * cos + lz * sin, y0 + ly, z - lx * sin + lz * cos];
    const faces = [[0, 1, d / 2, w], [0, -1, d / 2, w], [1, 0, w / 2, d], [-1, 0, w / 2, d]];
    for (const [fx, fz, off, span] of faces) {
      const cols = Math.max(1, Math.floor(span / 0.05)), rows = Math.max(1, Math.floor(h / 0.07));
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        if (R() < 0.45) continue;
        const u = ((c + 0.5) / cols - 0.5) * span, v = ((r + 0.5) / rows) * h, o = off + 0.003;
        const hw = 0.012, hh = 0.016;
        // eixo ao longo da face: perpendicular à normal (fx, fz)
        const corner = (a, b) => (fx !== 0 ? toWorld(fx * o, v + b, u + a) : toWorld(u + a, v + b, fz * o));
        const q = [corner(-hw, -hh), corner(hw, -hh), corner(hw, hh), corner(-hw, hh)];
        winPos.push(...q[0], ...q[1], ...q[2], ...q[0], ...q[2], ...q[3]);
        const b = 0.45 + R() * 0.5;
        for (let s = 0; s < 6; s++) winCol.push(b, b, b);
      }
    }
  }
  const wgeo = new THREE.BufferGeometry();
  wgeo.setAttribute("position", new THREE.Float32BufferAttribute(winPos, 3));
  wgeo.setAttribute("color", new THREE.Float32BufferAttribute(winCol, 3));
  const windows = new THREE.Mesh(wgeo, glass);
  glass.side = THREE.DoubleSide;
  group.add(windows);

  // praça (o ponto da parada)
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(0.3, 28), new THREE.MeshBasicMaterial({ color: "#1a1c21", transparent: true, opacity: 0.9 }));
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(x0, y0 + 0.02, z0);
  group.add(plaza);

  return {
    group, top: new THREE.Vector3(x0, y0 + 0.62, z0), center: new THREE.Vector3(x0, y0 + 0.12, z0),
    light(amount) {
      wall.color.set(C.building).lerp(new THREE.Color(C.buildingLit), amount);
      wall.emissiveIntensity = amount * 0.35;
      glass.color.set(C.window).multiplyScalar(0.62 + 0.5 * amount);
      plaza.material.color.set("#1a1c21").lerp(new THREE.Color("#2a3266"), amount);
    },
  };
}

/** O Chevettinho (o Chevette "Tubarão" 73 de chevette.js), com a frente apontando para +z. */
function buildCar() {
  const car = new THREE.Group();
  const model = buildChevette({ paint: C.body });
  model.scale.setScalar(CAR_LENGTH / CHEVETTE_LENGTH);
  model.rotation.y = -Math.PI / 2; // o modelo nasce com a frente em +x
  car.add(model);

  // faróis: um leque de luz no asfalto
  const shape = new THREE.Shape();
  shape.moveTo(-0.05, 0); shape.lineTo(0.05, 0); shape.lineTo(0.24, 0.72); shape.lineTo(-0.24, 0.72); shape.closePath();
  const beam = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({
    color: "#eceef1", transparent: true, opacity: 0.09, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  }));
  beam.rotation.x = Math.PI / 2;
  beam.position.set(0, 0.012, CAR_LENGTH / 2);
  car.add(beam);
  car.userData.beam = beam;

  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.17, 20), new THREE.MeshBasicMaterial({ color: "#000000", transparent: true, opacity: 0.35, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(0.75, 1.15, 1);
  shadow.position.y = 0.004;
  car.add(shadow);
  return car;
}

/* ---------- a cena ---------- */

/**
 * Cria o diorama dentro de `root` (o `.atlas`). Devolve null se o navegador não tiver WebGL,
 * e o roadmap segue com o mapa em SVG.
 */
export function createAtlas3D({ root, road, cities, cityLen, labels }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.className = "atlas__canvas";
  root.prepend(renderer.domElement);

  const total = road.getTotalLength();
  const model = buildTerrainModel(road, cities, cityLen, total);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 100);

  // luz de lua fria vinda da frente/direita, e um céu cobalto bem fraco
  scene.add(new THREE.AmbientLight("#ffffff", 0.3));
  scene.add(new THREE.HemisphereLight("#5868c0", "#121317", 0.35));
  const moon = new THREE.DirectionalLight("#e6e9ff", 3.4);
  moon.position.set(-3, 5, 4);
  scene.add(moon);

  const terrain = terrainMesh(model);
  scene.add(terrain.mesh, terrain.rimLine);

  // estrada: asfalto, trecho rodado (revelado até o carro) e faixa central
  const { pts } = model;
  scene.add(new THREE.Mesh(ribbon(pts, ROAD_W, 0.03), flatMat(C.asphalt)));
  const doneGeo = ribbon(pts, ROAD_W, 0.034);
  scene.add(new THREE.Mesh(doneGeo, flatMat(C.done, { polygonOffsetFactor: -2, polygonOffsetUnits: -2 })));
  scene.add(new THREE.Mesh(ribbon(pts, 0.022, 0.037, (p) => Math.floor((p.l * SCALE) / 0.11) % 2 === 0),
    flatMat(C.lane, { transparent: true, opacity: 0.55, polygonOffsetFactor: -3, polygonOffsetUnits: -3 })));
  const doneLaneGeo = ribbon(pts, 0.022, 0.039);
  scene.add(new THREE.Mesh(doneLaneGeo, flatMat(C.accent, { polygonOffsetFactor: -4, polygonOffsetUnits: -4 })));

  // turbo: rastro de luz cobalto atrás do carro (cor por vértice somada à cena; preto = apagado)
  const trailGeo = ribbon(pts, ROAD_W * 0.7, 0.045);
  trailGeo.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(trailGeo.attributes.position.count * 3), 3));
  const trailCol = trailGeo.attributes.color.array;
  scene.add(new THREE.Mesh(trailGeo, flatMat("#ffffff", {
    vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    polygonOffsetFactor: -5, polygonOffsetUnits: -5,
  })));
  const legLen = (cityLen.at(-1) - cityLen[0]) / Math.max(1, cityLen.length - 1);
  const trailRGB = [0.5, 0.6, 1];
  let trailOn = false;
  function paintTrail(length, direction, boost) {
    if (!boost && !trailOn) return;
    trailOn = boost > 0;
    const reach = legLen * 1.3;
    const glowAt = (l) => {
      const behind = direction * (length - l);
      return behind < 0 || behind > reach ? 0 : boost * (1 - behind / reach) ** 1.6;
    };
    for (let i = 0; i < pts.length - 1; i++) {
      const ga = glowAt(pts[i].l), gb = glowAt(pts[i + 1].l);
      [ga, gb, ga, ga, gb, gb].forEach((g, v) => {
        const o = (i * 6 + v) * 3;
        trailCol[o] = trailRGB[0] * g; trailCol[o + 1] = trailRGB[1] * g; trailCol[o + 2] = trailRGB[2] * g;
      });
    }
    trailGeo.attributes.color.needsUpdate = true;
  }

  // postes ao longo da estrada, alternando os lados
  const glow = glowTexture();
  const lamps = [];
  const pole = new THREE.MeshLambertMaterial({ color: "#0b0c0e" });
  const poleGeo = new THREE.BoxGeometry(0.012, 0.16, 0.012);
  const poolGeo = new THREE.CircleGeometry(0.16, 20);
  let sideSign = 1;
  for (let l = 0.35 / SCALE; l < total; l += 0.75 / SCALE) {
    const i = Math.round((l / total) * SAMPLES), p = pts[i], q = pts[Math.min(SAMPLES, i + 1)];
    const len = Math.hypot(q.x - p.x, q.z - p.z) || 1;
    const nx = -(q.z - p.z) / len, nz = (q.x - p.x) / len;
    sideSign *= -1;
    const x = p.x + nx * 0.19 * sideSign, z = p.z + nz * 0.19 * sideSign;
    const post = new THREE.Mesh(poleGeo, pole);
    post.position.set(x, p.y + 0.1, z);
    const bulb = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: "#ffffff", blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    bulb.position.set(x, p.y + 0.19, z);
    bulb.scale.setScalar(0.26); // LAMP_SIZE
    const pool = new THREE.Mesh(poolGeo, new THREE.MeshBasicMaterial({ map: glow, color: C.window, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false }));
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(p.x + nx * 0.1 * sideSign, p.y + 0.045, p.z + nz * 0.1 * sideSign);
    scene.add(post, bulb, pool);
    lamps.push({ bulb, pool, at: l });
  }
  const setLamp = (lamp, k) => { lamp.bulb.material.opacity = k; lamp.pool.material.opacity = 0.3 * k; };
  // turbo: os postes perto do carro se esticam em riscos de luz quando ele passa
  const LAMP_SIZE = 0.26;
  function streakLamps(length, boost) {
    for (const lamp of lamps) {
      const near = boost * clamp01(1 - Math.abs(lamp.at - length) / (0.9 / SCALE));
      lamp.bulb.scale.set(LAMP_SIZE * (1 + 0.4 * near), LAMP_SIZE * (1 + 2.4 * near), 1);
    }
  }

  const towns = cities.map((_, i) => buildCity(model, i));
  towns.forEach((t) => scene.add(t.group));

  const car = buildCar();
  scene.add(car);

  /* ---------- carro e estrada rodada ---------- */

  const pointAt = (l) => {
    const f = clamp01(l / total) * SAMPLES, i = Math.min(SAMPLES - 1, Math.floor(f)), k = f - i;
    const a = pts[i], b = pts[i + 1];
    return new THREE.Vector3(lerp(a.x, b.x, k), lerp(a.y, b.y, k), lerp(a.z, b.z, k));
  };

  function placeCar(length, direction) {
    const p = pointAt(length);
    const ahead = pointAt(length + direction * 4);
    car.position.set(p.x, p.y + 0.035, p.z);
    if (ahead.distanceToSquared(p) > 1e-8) car.lookAt(ahead.x, ahead.y + 0.035, ahead.z);
    const count = Math.round(clamp01(length / total) * SAMPLES) * 6;
    doneGeo.setDrawRange(0, count);
    doneLaneGeo.setDrawRange(0, count);
  }

  /* ---------- câmera ---------- */

  const center = new THREE.Vector3((model.bounds.x0 + model.bounds.x1) / 2, 0, (model.bounds.z0 + model.bounds.z1) / 2);
  let base = { azim: 41 * DEG, elev: 34 * DEG };

  function applyRig(r) {
    const c = Math.cos(r.elev);
    camera.position.set(r.target.x + r.dist * c * Math.sin(r.azim), r.target.y + r.dist * Math.sin(r.elev), r.target.z + r.dist * c * Math.cos(r.azim));
    camera.lookAt(r.target);
    camera.updateMatrixWorld();
  }

  /** Distância em que o diorama inteiro cabe na tela, para este ângulo. */
  function fitDistance(target, azim, elev) {
    let dist = 20;
    const v = new THREE.Vector3();
    for (let n = 0; n < 5; n++) {
      applyRig({ target, dist, azim, elev });
      let m = 0;
      for (const c of terrain.corners) { v.copy(c).project(camera); m = Math.max(m, Math.abs(v.x) / 0.96, Math.abs(v.y) / 0.9); }
      dist *= m;
    }
    return dist;
  }

  const close = (i, dist, azimShift = 0) => ({ target: towns[i].center.clone(), dist, azim: base.azim + azimShift, elev: 30 * DEG });
  const mixRig = (a, b, k) => ({
    target: a.target.clone().lerp(b.target, k),
    dist: a.dist * Math.pow(b.dist / a.dist, k),
    azim: lerp(a.azim, b.azim, k),
    elev: lerp(a.elev, b.elev, k),
  });

  function resize() {
    const w = root.clientWidth || window.innerWidth, h = root.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // tela em pé (celular): a câmera gira para a estrada caber na vertical
    base = w / h < 0.9 ? { azim: 72 * DEG, elev: 46 * DEG } : { azim: 41 * DEG, elev: 34 * DEG };
  }

  /* ---------- rótulos das paradas (HTML por cima do canvas) ---------- */

  const v = new THREE.Vector3();
  function placeLabels() {
    const w = renderer.domElement.clientWidth, h = renderer.domElement.clientHeight;
    labels.forEach((el, i) => {
      v.copy(towns[i].top).project(camera);
      const visible = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
      el.style.opacity = visible ? "" : "0";
      el.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px) translate(-50%, -100%)`;
    });
  }

  function draw(rig) {
    applyRig(rig);
    renderer.render(scene, camera);
    placeLabels();
  }

  /** rise e drive chegam no mesmo instante do relógio: os dois viram um quadro só. */
  let drawQueued = false;
  function drawTravel() {
    if (drawQueued) return;
    drawQueued = true;
    queueMicrotask(() => {
      drawQueued = false;
      const rig = mixRig(mixRig(trip.start, trip.overview, trip.riseK), trip.overviewEnd, trip.driveK);
      // turbo: a câmera chega mais perto do carro e a lente abre um pouco
      if (trip.boost > 0) {
        rig.dist *= 1 - 0.14 * trip.boost;
        rig.target.lerp(car.position, 0.3 * trip.boost);
      }
      const fov = 28 + 5 * trip.boost;
      if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
      draw(rig);
    });
  }

  /* ---------- a viagem ---------- */

  let trip = null;

  return {
    /** Prepara a cena antes de aparecer: câmera perto da cidade de origem, postes apagados. */
    start(from, to, length, direction) {
      resize();
      const overview = { target: center.clone(), azim: base.azim - 9 * DEG, elev: base.elev };
      overview.dist = fitDistance(overview.target, overview.azim, overview.elev);
      const overviewEnd = { ...overview, target: center.clone().lerp(towns[to].center, 0.18), azim: base.azim + 9 * DEG };
      trip = {
        from, to, direction, overview, overviewEnd, start: close(from, 4.6, -14 * DEG), end: close(to, 3.2, 12 * DEG),
        riseK: 0, driveK: 0, boost: 0,
      };
      camera.fov = 28;
      camera.updateProjectionMatrix();
      paintTrail(length, direction, 0);
      streakLamps(length, 0);
      car.userData.beam.material.opacity = 0.09;
      towns.forEach((t, i) => t.light(i === from ? 0.25 : 0));
      labels.forEach((el, i) => { el.classList.toggle("is-to", i === to); el.classList.toggle("is-from", i === from); });
      lamps.forEach((lamp) => setLamp(lamp, 0));
      placeCar(length, direction);
      draw(trip.start);
    },
    /** A câmera sobe e os postes acendem em sequência, a partir do carro. */
    rise(k) {
      const here = cityLen[trip.from], fade = 0.6 / SCALE;
      const reach = k * (total + fade); // a "onda" de luz sai da cidade de origem para os dois lados
      lamps.forEach((lamp) => { const d = Math.abs(lamp.at - here); setLamp(lamp, smooth(d, d + fade, reach)); });
      trip.riseK = k;
      drawTravel();
    },
    /** O carro dirige; a câmera orbita devagar e a cidade de destino se ilumina. boost: turbo (0 a 1). */
    drive(k, length, boost = 0) {
      placeCar(length, trip.direction);
      towns[trip.to].light(smooth(0.45, 1, k));
      towns[trip.from].light(0.25 * (1 - k));
      paintTrail(length, trip.direction, boost);
      streakLamps(length, boost);
      car.userData.beam.material.opacity = 0.09 + 0.14 * boost;
      trip.driveK = k;
      trip.boost = boost;
      drawTravel();
    },
    /** A câmera mergulha na cidade de destino. */
    dive(k) {
      draw(mixRig(trip.overviewEnd, trip.end, k));
    },
  };
}
