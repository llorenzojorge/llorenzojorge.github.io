/** Menu mobile, link da seção ativa e barra de progresso de leitura. */

function initMobileMenu(toggle, links) {
  const setOpen = (open) => {
    links.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
  };

  toggle.addEventListener("click", () => setOpen(!links.classList.contains("is-open")));
  links.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
  document.addEventListener("click", (e) => {
    if (links.classList.contains("is-open") && !e.target.closest(".nav")) setOpen(false);
  });
}

function initActiveLink(links) {
  const byId = new Map([...links.querySelectorAll("a")].map((a) => [a.getAttribute("href").slice(1), a]));
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      byId.forEach((a) => a.classList.remove("is-active"));
      byId.get(entry.target.id)?.classList.add("is-active");
    });
  }, { rootMargin: "-45% 0px -50% 0px" });

  document.querySelectorAll("main > section").forEach((section) => observer.observe(section));
}

function initProgressBar(bar) {
  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
  };
  window.addEventListener("scroll", update, { passive: true });
  update();
}

export function initNavigation() {
  const links = document.getElementById("nav-links");
  initMobileMenu(document.getElementById("menu-toggle"), links);
  initActiveLink(links);
  initProgressBar(document.getElementById("progress-bar"));
}
