function initTechTimeline() {
  const timeline = document.getElementById("tech-timeline");
  const progressEl = document.getElementById("tech-line-progress");
  const markerEl = document.getElementById("tech-marker");
  const items = Array.from(document.querySelectorAll(".tech__item"));

  if (!timeline || !progressEl || !markerEl || !items.length) return;

  let timelineTop = 0;
  let timelineHeight = 0;
  let itemCenters = [];
  let activeCount = -1;
  let ticking = false;

  /*
   * Medir é caro: só acontece no load e no resize. Assim o loop de scroll
   * faz apenas leituras baratas e escritas de transform, sem forçar
   * reflow a cada frame (era isso que travava a rolagem).
   */
  const measure = () => {
    const timelineRect = timeline.getBoundingClientRect();
    timelineTop = timelineRect.top + window.scrollY;
    timelineHeight = timelineRect.height;

    itemCenters = items.map((item) => {
      const rect = item.getBoundingClientRect();
      return rect.top + window.scrollY - timelineTop + rect.height / 2;
    });
  };

  const update = () => {
    ticking = false;
    if (!timelineHeight) return;

    const scrolled = window.scrollY + window.innerHeight / 2 - timelineTop;
    const progress = Math.min(Math.max(scrolled / timelineHeight, 0), 1);
    const markerY = progress * timelineHeight;

    // scaleY/translateY rodam no compositor, sem recalcular layout.
    progressEl.style.transform = `scaleY(${progress})`;
    markerEl.style.transform = `translate(-50%, -50%) translateY(${markerY}px)`;

    let reached = 0;
    while (reached < itemCenters.length && markerY >= itemCenters[reached]) {
      reached += 1;
    }

    // Só mexe em classes quando o item destacado realmente muda.
    if (reached !== activeCount) {
      activeCount = reached;
      items.forEach((item, index) => {
        item.classList.toggle("is-active", index < reached);
        item.classList.toggle("is-current", index === reached - 1);
      });
    }
  };

  const requestUpdate = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };

  const remeasure = () => {
    measure();
    requestUpdate();
  };

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", remeasure);
  window.addEventListener("load", remeasure);

  measure();
  update();
}

document.addEventListener("DOMContentLoaded", initTechTimeline);
