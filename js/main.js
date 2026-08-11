/**
 * Observa elementos com [data-animate] e adiciona a classe "in-view"
 * quando entram no viewport. Reutilizável por qualquer seção.
 */
function initScrollAnimations() {
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const animatedEls = document.querySelectorAll("[data-animate]");
  if (!animatedEls.length) return;

  if (prefersReducedMotion) {
    animatedEls.forEach((el) => el.classList.add("in-view"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  animatedEls.forEach((el) => observer.observe(el));
}

/**
 * Divide o rótulo dos botões em uma letra por span, para a animação em
 * cascata. O texto original vira `aria-label` e os spans ficam ocultos
 * para leitores de tela, que senão soletrariam letra por letra.
 */
function initButtonCascade() {
  document.querySelectorAll(".btn").forEach((btn) => {
    const label = btn.textContent.trim();
    if (!label) return;

    const wrapper = document.createElement("span");
    wrapper.setAttribute("aria-hidden", "true");

    [...label].forEach((char, index) => {
      const outer = document.createElement("span");
      outer.className = "btn__char";
      outer.style.setProperty("--i", index);

      // A cópia que desce por cima vem do ::before via attr(data-char).
      const inner = document.createElement("span");
      inner.className = "btn__char-inner";
      inner.dataset.char = char;
      inner.textContent = char;

      outer.appendChild(inner);
      wrapper.appendChild(outer);
    });

    btn.setAttribute("aria-label", label);
    btn.replaceChildren(wrapper);
  });
}

/**
 * Bloqueia arrastar e o menu de contexto sobre imagens/SVGs.
 * É uma barreira contra a cópia casual: o arquivo continua acessível
 * pela URL direta ou pelo DevTools, o que nenhum código de página evita.
 */
function initAssetGuard() {
  document.querySelectorAll("img").forEach((img) => {
    img.setAttribute("draggable", "false");
  });

  document.addEventListener("dragstart", (event) => {
    if (event.target.closest("img, svg")) event.preventDefault();
  });

  document.addEventListener("contextmenu", (event) => {
    if (event.target.closest("img, svg")) event.preventDefault();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initScrollAnimations();
  initButtonCascade();
  initAssetGuard();
});
