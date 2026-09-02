/*
 * Comportamento da página /ativos:
 *   - liga todos os CTAs ao WhatsApp com a mensagem da sua origem
 *   - botão flutuante que aparece depois da hero
 *   - carrossel de prova social
 *   - JSON-LD de FAQPage gerado a partir do próprio acordeão
 *   - sincroniza o telefone do rodapé com a constante central
 *
 * O acordeão do FAQ em si é o js/faq.js do site, reaproveitado: esta
 * página usa as mesmas classes .faq__item / .faq__question.
 */
(function () {
  "use strict";

  var cfg = window.DGAtivos;

  /*
   * Todo CTA de WhatsApp é um <a data-wa="chave">. O href é montado aqui
   * a partir do mapa de mensagens, então o HTML nunca repete uma URL e
   * mudar o número é mexer em um lugar só.
   */
  function initWhatsAppLinks() {
    if (!cfg) return;

    document.querySelectorAll("[data-wa]").forEach(function (el) {
      var origin = el.getAttribute("data-wa");

      el.setAttribute("href", cfg.waFrom(origin));
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener noreferrer");

      el.addEventListener("click", function () {
        cfg.track(origin);
      });
    });
  }

  /*
   * O flutuante só entra depois que a hero sai de cena: na primeira
   * dobra ele competiria com o CTA principal, que está logo ali.
   */
  function initFloatingButton() {
    var float = document.querySelector(".wa-float");
    var hero = document.querySelector(".hero");
    if (!float || !hero) return;

    var io = new IntersectionObserver(
      function (entries) {
        float.classList.toggle("is-visible", !entries[0].isIntersecting);
      },
      { threshold: 0 }
    );

    io.observe(hero);
  }

  /*
   * Carrossel por scroll-snap: o CSS já faz o arrasto e o encaixe, então
   * aqui só empurramos o scrollLeft e mantemos o estado das setas.
   */
  function initSocialCarousel() {
    var viewport = document.querySelector(".social__viewport");
    var prev = document.querySelector('.social__arrow[data-dir="prev"]');
    var next = document.querySelector('.social__arrow[data-dir="next"]');
    if (!viewport || !prev || !next) return;

    var card = viewport.querySelector(".social__card");

    function step() {
      if (!card) return viewport.clientWidth;
      /* Largura do card + o gap, lido do layout real para não repetir o
         valor do clamp() do CSS aqui dentro. */
      var styles = window.getComputedStyle(viewport.querySelector(".social__track"));
      return card.offsetWidth + (parseFloat(styles.columnGap) || 0);
    }

    function syncArrows() {
      var max = viewport.scrollWidth - viewport.clientWidth;
      prev.disabled = viewport.scrollLeft <= 1;
      next.disabled = viewport.scrollLeft >= max - 1;
    }

    prev.addEventListener("click", function () {
      viewport.scrollBy({ left: -step(), behavior: "smooth" });
    });

    next.addEventListener("click", function () {
      viewport.scrollBy({ left: step(), behavior: "smooth" });
    });

    viewport.addEventListener("scroll", syncArrows, { passive: true });
    window.addEventListener("resize", syncArrows, { passive: true });
    syncArrows();
  }

  /*
   * Schema de FAQPage montado a partir do DOM, e não escrito à mão: o
   * acordeão vira a única fonte da verdade, sem risco de o schema e a
   * página divergirem depois de uma edição de copy.
   *
   * Perguntas cuja resposta ainda é placeholder ficam de fora. Enviar
   * "[X]" para o Google seria pior que não enviar nada.
   */
  function initFaqSchema() {
    var items = document.querySelectorAll(".faq--dark .faq__item");
    if (!items.length) return;

    var entries = [];

    items.forEach(function (item) {
      var q = item.querySelector(".faq__question-text");
      var a = item.querySelector(".faq__answer-text");
      if (!q || !a) return;

      var question = q.textContent.trim();
      var answer = a.textContent.trim();

      if (!question || !answer || answer.indexOf("[X]") !== -1) return;

      entries.push({
        "@type": "Question",
        name: question,
        acceptedAnswer: { "@type": "Answer", text: answer },
      });
    });

    if (!entries.length) return;

    var script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: entries,
    });

    document.head.appendChild(script);
  }

  /* O telefone vive em js/ativos-config.js; o HTML só marca onde ele vai. */
  function initPhone() {
    if (!cfg) return;

    document.querySelectorAll("[data-phone]").forEach(function (el) {
      el.setAttribute("href", "tel:" + cfg.PHONE_TEL);
      el.textContent = cfg.PHONE_DISPLAY;
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initWhatsAppLinks();
    initFloatingButton();
    initSocialCarousel();
    initFaqSchema();
    initPhone();
  });
})();
