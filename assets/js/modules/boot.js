/** Tela de abertura: "conecta" no portfólio, carrega e se abre revelando o site. */
import { sleep } from "../core/utils.js";

const COMMAND = "ssh lorenzo@portfolio";
const STAGES = ["resolving modules", "compiling architecture", "running tests", "ready ✓"];
const LOAD_DURATION = 1150;

/**
 * Avança a barra pelo relógio (setTimeout), não por requestAnimationFrame:
 * assim a abertura termina mesmo se o navegador pausar a renderização.
 */
function animateProgress(fill, status, percent) {
  const startedAt = performance.now();
  return new Promise((resolve) => {
    const tick = () => {
      const progress = Math.min(1, (performance.now() - startedAt) / LOAD_DURATION);
      const eased = 1 - Math.pow(1 - progress, 3);
      fill.style.width = `${eased * 100}%`;
      percent.textContent = `${Math.round(eased * 100)}%`;
      status.textContent = progress === 1 ? STAGES[3] : STAGES[Math.min(2, Math.floor(eased * 3))];
      if (progress < 1) setTimeout(tick, 16);
      else resolve();
    };
    tick();
  });
}

export async function playBoot() {
  const screen = document.getElementById("boot");
  const command = document.getElementById("boot-cmd");

  for (let i = 1; i <= COMMAND.length; i++) {
    command.textContent = COMMAND.slice(0, i);
    await sleep(28);
  }
  await animateProgress(
    document.getElementById("boot-fill"),
    document.getElementById("boot-status"),
    document.getElementById("boot-pct"),
  );
  await sleep(220);

  screen.classList.add("is-done");
  setTimeout(() => screen.classList.add("is-gone"), 1100);
}
