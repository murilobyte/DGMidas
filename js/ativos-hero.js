/*
 * Animação da hero de /ativos.
 *
 * Três camadas, todas opcionais:
 *   1. respiração contínua das barras (loop ocioso)
 *   2. reação ao scroll (ScrollTrigger com scrub)
 *   3. grão animado no canvas
 *
 * Nada aqui é necessário para a página ser legível. O CSS já entrega o
 * estado final; toda animação de entrada usa `gsap.from()`, então se o
 * GSAP não carregar o texto simplesmente já está no lugar.
 */
(function () {
  "use strict";

  var BAR_COUNT = 15;
  /* Divisor de resolução do grão: desenhamos pequeno e o CSS escala. */
  var NOISE_SCALE = 3;
  var NOISE_MAX_EDGE = 420;
  /* Redesenha o grão a cada N frames — a 60fps dá ~20 quadros por
     segundo, o suficiente para o olho ler como ruído vivo. */
  var NOISE_EVERY = 3;

  function initHeroBars() {
    var hero = document.querySelector(".hero");
    if (!hero) return;

    buildBars(hero.querySelector(".hero__bars"));

    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* Estado final estático: sem loop, sem grão, sem scrub. */
    if (reduced) return;

    if (window.gsap) initMotion(hero);

    initNoise(hero);
  }

  /*
   * As 15 colunas são geradas em JS de propósito: são elementos puramente
   * decorativos, e 30 spans vazios no HTML só atrapalhariam a leitura do
   * documento (e o peso da página) sem acrescentar nada semanticamente.
   * O container já é aria-hidden.
   */
  function buildBars(container) {
    if (!container || container.children.length) return;

    var frag = document.createDocumentFragment();

    for (var i = 0; i < BAR_COUNT; i++) {
      var bar = document.createElement("div");
      bar.className = "bar";

      var top = document.createElement("span");
      top.className = "bar__top";

      var bottom = document.createElement("span");
      bottom.className = "bar__bottom";

      bar.appendChild(top);
      bar.appendChild(bottom);
      frag.appendChild(bar);
    }

    container.appendChild(frag);
  }

  function initMotion(hero) {
    var gsap = window.gsap;

    /* gsap.context() agrupa tudo o que for criado dentro dele; um
       ctx.revert() desfaz de uma vez (tweens, ScrollTriggers e estilos
       inline). Guardado em DGAtivosHero para quem precisar derrubar. */
    var ctx = gsap.context(function () {
      /* --- 1. respiração contínua -------------------------------- */
      var breathe = [
        gsap.to(".bar__top", {
          "--stop": "38%",
          duration: 3.2,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          stagger: { each: 0.14, from: "center" },
        }),
        gsap.to(".bar__bottom", {
          "--stop": "62%",
          duration: 3.2,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          stagger: { each: 0.14, from: "center" },
        }),
      ];

      /* Aba em segundo plano não precisa animar nada. */
      document.addEventListener("visibilitychange", function () {
        breathe.forEach(function (tween) {
          if (document.hidden) tween.pause();
          else tween.resume();
        });
      });

      /* --- 2. entrada da headline e do conteúdo ------------------ */
      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .from(".hero__line-inner", {
          yPercent: 100,
          duration: 0.9,
          stagger: 0.08,
        })
        .from(
          [".hero__eyebrow", ".hero__text", ".hero__actions", ".hero__microcopy", ".hero__badges"],
          { y: 18, opacity: 0, duration: 0.7, stagger: 0.08 },
          0.15
        );

      /* --- 3. reação ao scroll ----------------------------------- */
      if (!window.ScrollTrigger) return;

      gsap.registerPlugin(window.ScrollTrigger);

      gsap
        .timeline({
          scrollTrigger: {
            /* O elemento, não o seletor: dentro de um gsap.context() com
               escopo em `hero`, ".hero" seria procurado entre os
               DESCENDENTES dele e nunca resolveria. */
            trigger: hero,
            start: "top top",
            end: "bottom top",
            scrub: 0.6,
          },
        })
        .to(
          ".bar",
          {
            scaleY: 0.25,
            transformOrigin: "center",
            stagger: { each: 0.02, from: "edges" },
          },
          0
        )
        .to(".hero__bars", { opacity: 0.35 }, 0);
    }, hero);

    window.DGAtivosHero = {
      destroy: function () {
        ctx.revert();
      },
    };
  }

  /*
   * Grão de filme. Desenhado em resolução reduzida e esticado pelo CSS —
   * um ImageData em tamanho real seria alguns megabytes por frame.
   * O loop só roda com a hero visível e a aba ativa.
   */
  function initNoise(hero) {
    var canvas = hero.querySelector(".hero__noise");
    if (!canvas || !canvas.getContext) return;

    var ctx2d = canvas.getContext("2d", { alpha: true });
    if (!ctx2d) return;

    var imageData = null;
    var buffer32 = null;
    var frame = 0;
    var rafId = 0;
    var visible = false;

    function resize() {
      var rect = hero.getBoundingClientRect();
      var w = Math.max(1, Math.min(NOISE_MAX_EDGE, Math.ceil(rect.width / NOISE_SCALE)));
      var h = Math.max(1, Math.min(NOISE_MAX_EDGE, Math.ceil(rect.height / NOISE_SCALE)));

      if (canvas.width === w && canvas.height === h) return;

      canvas.width = w;
      canvas.height = h;
      imageData = ctx2d.createImageData(w, h);
      /* Uma escrita de 32 bits por pixel em vez de quatro de 8: é o que
         mantém o custo do grão irrelevante no perfil. */
      buffer32 = new Uint32Array(imageData.data.buffer);
    }

    function draw() {
      if (!buffer32) return;

      for (var i = 0; i < buffer32.length; i++) {
        var v = (Math.random() * 255) | 0;
        /* Little-endian: 0xAABBGGRR. Alpha fixo em 255; quem controla a
           intensidade é o opacity do CSS. */
        buffer32[i] = (255 << 24) | (v << 16) | (v << 8) | v;
      }

      ctx2d.putImageData(imageData, 0, 0);
    }

    function loop() {
      rafId = window.requestAnimationFrame(loop);
      if (frame++ % NOISE_EVERY === 0) draw();
    }

    function start() {
      if (rafId || !visible || document.hidden) return;
      resize();
      loop();
    }

    function stop() {
      if (!rafId) return;
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }

    /* Fora da viewport o grão não é visto por ninguém — o rAF pararia de
       qualquer forma em algumas engines, mas não em todas. */
    var io = new IntersectionObserver(
      function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) start();
        else stop();
      },
      { threshold: 0 }
    );
    io.observe(hero);

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop();
      else start();
    });

    var resizeTimer = 0;
    window.addEventListener(
      "resize",
      function () {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(function () {
          resize();
          if (rafId) draw();
        }, 150);
      },
      { passive: true }
    );

    resize();
  }

  document.addEventListener("DOMContentLoaded", initHeroBars);
})();
