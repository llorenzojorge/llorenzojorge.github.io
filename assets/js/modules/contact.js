/** Contato: copiar o e-mail e o ano no rodapé. */
import { CONTACT_EMAIL } from "../core/config.js";
import { t } from "../i18n/index.js";

function toast(message) {
  const el = document.createElement("div");
  el.className = "toast";
  el.setAttribute("role", "status");
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1800);
}

export function initContact() {
  document.getElementById("copy-email").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      toast(t("contact.copied"));
    } catch {
      window.location.href = `mailto:${CONTACT_EMAIL}`;
    }
  });
  document.getElementById("year").textContent = new Date().getFullYear();
}
