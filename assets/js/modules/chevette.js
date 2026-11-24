/**
 * O Chevettinho em 3D: um Chevette "Tubarão" 73, o primeiro do Brasil.
 *
 * A carroceria é extrudada do perfil lateral do carro (bico de tubarão, capô longo,
 * cabine com teto reto e porta-malas curto) e depois esculpida: a cabine afina para
 * cima e as pontas se arredondam vistas de cima, como nos carros dos anos 70.
 * Vidros com colunas, rodas com calota cromada, faróis redondos e para-choques finos.
 *
 * Medidas em "metros de maquete": ~4,3 de comprimento, frente apontando para +x,
 * rodas no chão (y = 0). Quem usa escala e gira o grupo.
 */
import * as THREE from "../../vendor/three.min.js";

const W = 1.62;                       // largura total
const BEVEL_T = 0.1, BEVEL_S = 0.07;  // arredondamento das bordas
const DEPTH = W - 2 * BEVEL_T;

// perfil lateral: da frente-baixo, por cima, até trás-baixo
const PROFILE = [[2.04, 0.36], [2.24, 0.6], [2.02, 0.86], [0.86, 0.98], [0.26, 1.4], [-0.76, 1.42], [-1.36, 1.04], [-2.0, 1.0], [-2.08, 0.8], [-2.02, 0.36]];
const WINDSHIELD = [[0.86, 0.98], [0.26, 1.4]];
const REAR_WINDOW = [[-0.76, 1.42], [-1.36, 1.04]];
const PILLAR_B = -0.3, ROOF_CUT = 1.36;
const WHEEL = { r: 0.33, front: 1.32, rear: -1.28, arch: 0.42, base: 0.36 };

const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function extrude(shape, depth, bevel = true) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth, curveSegments: 18,
    bevelEnabled: bevel, bevelThickness: BEVEL_T, bevelSize: BEVEL_S, bevelSegments: 4,
  });
  g.translate(0, 0, -depth / 2);
  return g;
}

const polygon = (points) => {
  const s = new THREE.Shape();
  s.moveTo(...points[0]);
  points.slice(1).forEach((p) => s.lineTo(...p));
  s.closePath();
  return s;
};

/** A carroceria: o perfil com as caixas de roda recortadas. */
function bodyShape() {
  const { front, rear, arch, base } = WHEEL;
  const s = new THREE.Shape();
  s.moveTo(...PROFILE[0]);
  PROFILE.slice(1).forEach((p) => s.lineTo(...p));
  s.lineTo(rear - arch, base);
  s.absarc(rear, base, arch, Math.PI, 0, true);
  s.lineTo(front - arch, base);
  s.absarc(front, base, arch, Math.PI, 0, true);
  s.closePath();
  return s;
}

/** Cabine afinando para cima e pontas arredondadas (vale para carroceria e vidros). */
function sculpt(geo) {
  const belt = WINDSHIELD[0][1], roof = 1.42, nose = 2.24, tail = 2.08;
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    const cabin = 1 - 0.2 * smooth(belt - 0.05, roof, y);
    const ends = 1 - 0.09 * Math.max(smooth(nose - 0.7, nose + 0.1, x), smooth(-tail + 0.7, -tail - 0.1, x));
    p.setZ(i, p.getZ(i) * cabin * ends);
  }
  p.needsUpdate = true;
  return geo;
}

/** Vidros: para-brisa e vigia em tiras na inclinação, janelas laterais com colunas A, B e C. */
function glassPanes() {
  const d = BEVEL_S + 0.006; // um fio além da carroceria
  const off = ([a, b]) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy);
    return [[a[0] + (dy / n) * d, a[1] - (dx / n) * d], [b[0] + (dy / n) * d, b[1] - (dx / n) * d]];
  };
  const xAt = ([a, b], y) => a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]);
  const strip = (L, y0, y1) => {
    const [a, b] = L, dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy);
    const ix = (-dy / n) * 0.06, iy = (dx / n) * 0.06;
    const p0 = [xAt(L, y0), y0], p1 = [xAt(L, y1), y1];
    return [p0, p1, [p1[0] + ix, p1[1] + iy], [p0[0] + ix, p0[1] + iy]];
  };
  const ws = off(WINDSHIELD), rw = off(REAR_WINDOW);
  const belt = WINDSHIELD[0][1], rearBottom = REAR_WINDOW[1][1];
  const front = [[xAt(ws, belt) - 0.2, belt + 0.03], [xAt(ws, ROOF_CUT) - 0.12, ROOF_CUT], [PILLAR_B + 0.07, ROOF_CUT], [PILLAR_B + 0.07, belt + 0.03]];
  const cTop = xAt(rw, ROOF_CUT) + 0.28, cBottom = Math.min(xAt(rw, Math.max(rearBottom, belt)) + 0.45, PILLAR_B - 0.3);
  const rear = [[PILLAR_B - 0.07, belt + 0.03], [PILLAR_B - 0.07, ROOF_CUT], [cTop, ROOF_CUT], [cBottom, belt + 0.03]];
  return [strip(ws, belt, ROOF_CUT), strip(rw, ROOF_CUT, rearBottom), front, rear]
    .map((poly) => sculpt(extrude(polygon(poly), W + 0.012, false)));
}

/** Monta o carro. `paint` é a cor da lataria; `glow` faz ela se destacar à noite. */
export function buildChevette({ paint = "#5a73f0", glow = 0.22 } = {}) {
  const mat = {
    body: new THREE.MeshPhongMaterial({ color: paint, emissive: paint, emissiveIntensity: glow, specular: "#5d6a9a", shininess: 70 }),
    glass: new THREE.MeshPhongMaterial({ color: "#0d0f14", specular: "#8fa2ff", shininess: 90 }),
    chrome: new THREE.MeshPhongMaterial({ color: "#c9cdd4", specular: "#ffffff", shininess: 120 }),
    tire: new THREE.MeshLambertMaterial({ color: "#0b0c0e" }),
    black: new THREE.MeshLambertMaterial({ color: "#16171b" }),
    lamp: new THREE.MeshBasicMaterial({ color: "#f6f4ea" }),
    tail: new THREE.MeshBasicMaterial({ color: "#e07a5f" }),
  };
  const box = (w, h, d, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); return b; };
  const cylinderX = (r, len, m) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 24), m); c.rotation.z = Math.PI / 2; return c; };
  const cylinderZ = (r, len, m) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 28), m); c.rotation.x = Math.PI / 2; return c; };

  const car = new THREE.Group();
  car.add(new THREE.Mesh(sculpt(extrude(bodyShape(), DEPTH)), mat.body));
  glassPanes().forEach((g) => car.add(new THREE.Mesh(g, mat.glass)));

  // rodas: pneu, calota cromada e cubo
  const zWheel = W / 2 - 0.16;
  for (const x of [WHEEL.front, WHEEL.rear]) for (const z of [-zWheel, zWheel]) {
    const w = new THREE.Group();
    w.add(cylinderZ(WHEEL.r, 0.24, mat.tire), cylinderZ(WHEEL.r * 0.58, 0.25, mat.chrome), cylinderZ(WHEEL.r * 0.16, 0.26, mat.black));
    w.position.set(x, WHEEL.r, z);
    car.add(w);
  }

  // faróis redondos com aro cromado, no bico de tubarão
  for (const z of [-0.47, 0.47]) {
    const ring = cylinderX(0.16, 0.05, mat.chrome), lens = cylinderX(0.13, 0.06, mat.lamp);
    ring.position.set(2.22, 0.72, z);
    lens.position.set(2.235, 0.72, z);
    car.add(ring, lens);
  }
  // para-choques finos de cromo, grade e lanternas
  car.add(box(0.1, 0.08, 1.74, mat.chrome, 2.2, 0.42, 0), box(0.1, 0.08, 1.74, mat.chrome, -2.12, 0.42, 0));
  car.add(box(0.06, 0.14, 0.7, mat.black, 2.2, 0.53, 0));
  for (const z of [-0.58, 0.58]) car.add(box(0.05, 0.1, 0.32, mat.tail, -2.1, 0.86, z));
  return car;
}

/** Comprimento do carro, para quem precisa escalar. */
export const CHEVETTE_LENGTH = 4.32;
