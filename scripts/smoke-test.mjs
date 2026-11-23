/**
 * Teste de fumaça: abre o site num Chrome headless, navega como um visitante
 * e confere abertura, estrada, viagem (transição do mapa), rolagem e o guia.
 * Salva capturas em ./.smoke/ (ignorada pelo Git).
 *
 * Uso (com o site servido em http://localhost:5173):
 *   node scripts/smoke-test.mjs [url] [desktop|tablet|mobile]
 *
 * Sem dependências: só Node 22+ (fetch e WebSocket nativos) e o Google Chrome.
 * Caminho do Chrome: variável CHROME_PATH ou o padrão do Windows.
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const url = process.argv[2] ?? "http://localhost:5173/";
const device = process.argv[3] ?? "desktop";
const chrome = process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const viewport = { desktop: [1440, 900], tablet: [900, 1100], mobile: [390, 844] }[device];
const outDir = join(process.cwd(), ".smoke");
mkdirSync(outDir, { recursive: true });

const port = 9400 + Math.floor(Math.random() * 400);
const proc = spawn(chrome, [
  "--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), `smoke-${port}`)}`,
  `--window-size=${viewport[0]},${viewport[1]}`, "--no-first-run", "--hide-scrollbars", "--enable-unsafe-swiftshader", // WebGL por software, para o atlas 3D
  "about:blank",
], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let ws, id = 0;
const pending = new Map();
const send = (method, params = {}) => new Promise((resolve) => { const i = ++id; pending.set(i, resolve); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;
const shot = async (name) => {
  const r = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(outDir, `${device}-${name}.png`), Buffer.from(r.result.data, "base64"));
};
const state = () => ev(`(() => { const r = getComputedStyle(document.getElementById('route')); return {
  scrollY: Math.round(scrollY),
  active: document.querySelector('.map__stop.is-active')?.getAttribute('href'),
  odometer: document.getElementById('odo').textContent,
  car: r.getPropertyValue('--car-x') + ', ' + r.getPropertyValue('--car-y'),
  bubble: !document.getElementById('buddy-bubble').hidden,
}; })()`);

const report = { device, errors: [], checks: {} };
const check = (name, ok) => { report.checks[name] = ok ? "ok" : "FALHOU"; };

try {
  let target;
  for (let i = 0; i < 40 && !target; i++) {
    await sleep(250);
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === "page"); } catch {}
  }
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r));
  ws.addEventListener("message", (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method === "Runtime.exceptionThrown") report.errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
    if (m.method === "Log.entryAdded" && m.params.entry.level === "error") report.errors.push(`${m.params.entry.text} ${m.params.entry.url ?? ""}`);
  });
  await send("Runtime.enable"); await send("Log.enable"); await send("Page.enable");
  if (device === "mobile") await send("Emulation.setDeviceMetricsOverride", { width: viewport[0], height: viewport[1], deviceScaleFactor: 2, mobile: true });

  await send("Page.navigate", { url });
  await sleep(7500); // abertura + Chevettinho chegando
  await shot("1-inicio");
  const start = await state();
  check("abertura terminou", await ev(`document.documentElement.classList.contains('is-loaded')`));
  check("tour abre na primeira visita", start.bubble);
  check("diorama 3D carregou", await ev(`document.getElementById('atlas').classList.contains('atlas--3d')`));

  await ev(`document.getElementById('buddy-close').click()`);
  await ev(`document.querySelector('.map__stop[href="#projetos"]').click()`);
  await sleep(1300);
  await shot("2-viagem");
  check("mapa da transição aparece", await ev(`document.getElementById('atlas').classList.contains('is-on')`));
  await sleep(2600);
  await shot("3-chegada");
  const arrived = await state();
  check("chegou em projetos", arrived.active === "#projetos");

  await ev(`window.scrollTo(0, document.querySelector('#stack').offsetTop - 200)`);
  await sleep(400);
  check("carro acompanha a rolagem", (await state()).active === "#stack");

  await ev(`document.documentElement.style.scrollBehavior='auto'; (async () => { for (let y = 0; y <= document.documentElement.scrollHeight; y += 300) { scrollTo(0, y); await new Promise(r => setTimeout(r, 100)); } })()`);
  await sleep(2500);
  check("todas as seções revelam ao rolar", await ev(`document.querySelectorAll('.reveal:not(.is-in)').length === 0`));

  await ev(`window.scrollTo(0,0)`); await sleep(400);
  await ev(`document.getElementById('buddy-car').click()`); await sleep(500);
  await ev(`[...document.querySelectorAll('.buddy__btn')].find(b => /stack/i.test(b.textContent)).click()`);
  await sleep(3800);
  await shot("4-guia");
  const guided = await state();
  check("guia leva até a stack e responde", guided.active === "#stack" && guided.bubble);

  check("sem erros no console", report.errors.length === 0);
} catch (e) {
  report.errors.push(String(e));
} finally {
  console.log(JSON.stringify(report, null, 2));
  ws?.close();
  proc.kill();
  process.exitCode = Object.values(report.checks).every((v) => v === "ok") && report.errors.length === 0 ? 0 : 1;
}
