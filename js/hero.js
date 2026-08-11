function initHero() {
  const hero = document.querySelector(".hero");
  const phonesWrap = document.getElementById("hero-phones-wrap");
  if (!hero) return;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  const supportsHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  requestAnimationFrame(() => {
    hero.classList.add("is-loaded");
  });

  if (!phonesWrap || prefersReducedMotion) return;

  if (!supportsHover) return;

  // Só há deslocamento horizontal: a base do SVG precisa permanecer
  // encostada no fim do gradiente, sem variação vertical.
  let targetX = 0;
  let currentX = 0;
  let ticking = false;

  const applyTransform = () => {
    currentX += (targetX - currentX) * 0.08;

    phonesWrap.style.transform = `translate(calc(-50% + ${currentX}px), 0)`;

    if (Math.abs(targetX - currentX) >= 0.05) {
      requestAnimationFrame(applyTransform);
    } else {
      ticking = false;
    }
  };

  const requestTick = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(applyTransform);
    }
  };

  // O parallax só assume o transform depois da animação de entrada
  // terminar, senão o inline style cortaria a transição pela metade.
  window.setTimeout(() => {
    phonesWrap.style.transition = "opacity 0.8s var(--ease-default)";

    hero.addEventListener("mousemove", (event) => {
      const rect = hero.getBoundingClientRect();
      targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 10;
      requestTick();
    });

    hero.addEventListener("mouseleave", () => {
      targetX = 0;
      requestTick();
    });
  }, 1400);
}

document.addEventListener("DOMContentLoaded", initHero);
