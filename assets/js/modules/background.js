/**
 * Fundo animado: uma rede de nós que reage ao cursor, com "pacotes de dados"
 * viajando pelas conexões, como tráfego em um sistema distribuído.
 */
import { EVENTS } from "../core/config.js";
import { root } from "../core/utils.js";

const MAX_PACKETS = 22;
const MOUSE_REACH = 200;

export function initBackground(canvas) {
  const ctx = canvas.getContext("2d");
  const mouse = { x: -9999, y: -9999 };
  let width = 0, height = 0, nodes = [], packets = [], frame = null;
  let nodeColor = "177, 140, 255", accentColor = "78, 201, 176";

  function readColors() {
    nodeColor = getComputedStyle(root).getPropertyValue("--node").trim() || nodeColor;
    accentColor = root.dataset.theme === "light" ? "11, 138, 115" : "78, 201, 176";
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = Math.round(Math.min(95, Math.max(30, (width * height) / 15000)));
    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 1.4 + 0.7,
    }));
    packets = [];
  }

  function moveNodes() {
    for (const node of nodes) {
      const dx = mouse.x - node.x, dy = mouse.y - node.y;
      const dist = Math.hypot(dx, dy);
      if (dist < MOUSE_REACH && dist > 1) { // leve atração pelo cursor
        node.x += (dx / dist) * 0.35;
        node.y += (dy / dist) * 0.35;
      }
      node.x += node.vx;
      node.y += node.vy;
      if (node.x < -20) node.x = width + 20; else if (node.x > width + 20) node.x = -20;
      if (node.y < -20) node.y = height + 20; else if (node.y > height + 20) node.y = -20;
    }
  }

  /** Desenha nós e conexões; devolve a lista de conexões para os pacotes usarem. */
  function drawNetwork(linkDistance) {
    const edges = [];
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist >= linkDistance) continue;
        edges.push([i, j]);
        ctx.strokeStyle = `rgba(${nodeColor}, ${0.13 * (1 - dist / linkDistance)})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }

      const toMouse = Math.hypot(a.x - mouse.x, a.y - mouse.y);
      const near = toMouse < MOUSE_REACH;
      if (near) {
        ctx.strokeStyle = `rgba(${accentColor}, ${0.45 * (1 - toMouse / MOUSE_REACH)})`;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
      }
      ctx.fillStyle = near ? `rgba(${accentColor}, .95)` : `rgba(${nodeColor}, .4)`;
      ctx.beginPath(); ctx.arc(a.x, a.y, near ? a.r + 1.2 : a.r, 0, Math.PI * 2); ctx.fill();
    }
    return edges;
  }

  function spawnPacket(edges) {
    if (!edges.length || packets.length >= MAX_PACKETS || Math.random() > 0.18) return;
    const [i, j] = edges[(Math.random() * edges.length) | 0];
    const reverse = Math.random() < 0.5;
    packets.push({
      from: reverse ? j : i,
      to: reverse ? i : j,
      t: 0,
      speed: 0.012 + Math.random() * 0.02,
      hops: 2 + ((Math.random() * 3) | 0),
      color: Math.random() < 0.5 ? accentColor : nodeColor,
    });
  }

  /** Avança um pacote; ao chegar num nó, segue para uma conexão vizinha. Devolve false quando ele some. */
  function updatePacket(p, edges, linkDistance) {
    const a = nodes[p.from], b = nodes[p.to];
    if (Math.hypot(a.x - b.x, a.y - b.y) > linkDistance * 1.25) return false;

    p.t += p.speed;
    if (p.t >= 1) {
      if (--p.hops <= 0) return false;
      const next = edges.filter(([i, j]) => (i === p.to || j === p.to) && i !== p.from && j !== p.from);
      if (!next.length) return false;
      const [i, j] = next[(Math.random() * next.length) | 0];
      p.from = p.to;
      p.to = i === p.to ? j : i;
      p.t = 0;
      return true;
    }

    const x = a.x + (b.x - a.x) * p.t, y = a.y + (b.y - a.y) * p.t;
    const tail = Math.max(0, p.t - 0.22);
    const tx = a.x + (b.x - a.x) * tail, ty = a.y + (b.y - a.y) * tail;

    const trail = ctx.createLinearGradient(tx, ty, x, y);
    trail.addColorStop(0, `rgba(${p.color}, 0)`);
    trail.addColorStop(1, `rgba(${p.color}, .9)`);
    ctx.strokeStyle = trail;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(x, y); ctx.stroke();

    ctx.fillStyle = `rgba(${p.color}, .22)`; // halo (mais barato que shadowBlur)
    ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(${p.color}, 1)`;
    ctx.beginPath(); ctx.arc(x, y, 2.1, 0, Math.PI * 2); ctx.fill();
    return true;
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    const linkDistance = Math.min(160, width / 6.5);
    moveNodes();
    const edges = drawNetwork(linkDistance);
    spawnPacket(edges);
    packets = packets.filter((p) => updatePacket(p, edges, linkDistance));
  }

  function loop() {
    draw();
    frame = requestAnimationFrame(loop);
  }

  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", (e) => {
    // a grade do fundo acende em volta do cursor
    root.style.setProperty("--cx", `${e.clientX}px`);
    root.style.setProperty("--cy", `${e.clientY}px`);
    if (e.pointerType === "mouse") { mouse.x = e.clientX; mouse.y = e.clientY; }
  });
  document.addEventListener("pointerleave", () => { mouse.x = mouse.y = -9999; });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = null; }
    else if (!frame) loop();
  });
  document.addEventListener(EVENTS.themeChange, readColors);

  resize();
  readColors();
  loop();
}
