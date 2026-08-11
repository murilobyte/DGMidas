function initFaq() {
  const items = document.querySelectorAll(".faq__item");
  if (!items.length) return;

  items.forEach((item) => {
    const button = item.querySelector(".faq__question");

    button.addEventListener("click", () => {
      const isOpen = item.classList.contains("is-open");

      items.forEach((other) => {
        other.classList.remove("is-open");
        other.querySelector(".faq__question").setAttribute("aria-expanded", "false");
      });

      if (!isOpen) {
        item.classList.add("is-open");
        button.setAttribute("aria-expanded", "true");
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", initFaq);
