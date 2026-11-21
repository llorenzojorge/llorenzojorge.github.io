/** Hero: o cartão-terminal digita os comandos, um por vez. */
import { sleep } from "../core/utils.js";

export async function playTerminal() {
  const lines = [...document.querySelectorAll("#term-body > p")];
  await sleep(900);
  for (const line of lines) {
    const typed = line.querySelector("[data-type]");
    if (!typed) {
      line.classList.add("is-on");
      await sleep(260);
      continue;
    }
    const full = typed.dataset.full ?? (typed.dataset.full = typed.textContent);
    typed.textContent = "";
    line.classList.add("is-on");
    for (let i = 1; i <= full.length; i++) {
      typed.textContent = full.slice(0, i);
      await sleep(55);
    }
    await sleep(180);
  }
}
