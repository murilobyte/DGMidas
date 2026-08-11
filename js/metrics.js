function initMetrics() {
  const section = document.querySelector(".metrics");
  if (!section) return;

  const numbers = section.querySelectorAll(".metric__number");
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  const animateCount = (el) => {
    const target = parseFloat(el.dataset.countTo);
    const prefix = el.dataset.prefix || "";
    const suffix = el.dataset.suffix || "";

    if (prefersReducedMotion) {
      el.textContent = `${prefix}${target}${suffix}`;
      return;
    }

    const duration = 1800;
    const start = performance.now();

    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const value = Math.round(target * easeOutCubic(progress));
      el.textContent = `${prefix}${value}${suffix}`;
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          numbers.forEach(animateCount);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.35 }
  );

  observer.observe(section);
}

document.addEventListener("DOMContentLoaded", initMetrics);
