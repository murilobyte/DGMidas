/*
 * Hero de /ativos — barras verticais com gradiente e grade de pontos.
 *
 * Tudo aqui foi tirado do CSS computado ao vivo do https://www.sui.io/ai,
 * não da descrição do briefing.
 *
 * ENTRADA (uma vez, ao carregar)
 *   As colunas CRESCEM da altura original (44,44 / 66,67 / 88,89 /
 *   100 svh) para a rampa alta. Como são centradas na vertical, crescer
 *   empurra as pontas claras do gradiente para fora da tela: é assim que
 *   o miolo escurece e o brilho recua para as bordas. Ao mesmo tempo os
 *   dois stops deslizam — topo 63%->40% e 100%->90%, base 37%->60% e
 *   0%->10%.
 *
 * FECHAMENTO (preso ao scroll)
 *   Medi as alturas das colunas ao longo de toda a rolagem do hero de
 *   referência:
 *
 *     scroll     0    200    400    600    800   1000   1200
 *     coluna 0  1618  1094   672    352    135     20      0
 *     coluna 7  7284  4924  3025   1586    608     90      0
 *
 *   Duas leituras importantes: a razão entre as colunas fica constante
 *   (7284/1618 = 4924/1094 = ... = 4,50), ou seja o fator é ÚNICO para
 *   todas; e a curva é (1-p)^1,93, que é praticamente power2.out.
 *
 *   Encolher devolve as pontas claras para dentro da tela, e as colunas
 *   viram aquele losango simétrico de "onda sonora" antes de sumirem. O
 *   texto some junto, um pouco antes.
 *
 * Nada disto é necessário para a página ser legível: o CSS já descreve o
 * estado final e toda animação de entrada usa `gsap.from()`.
 */
(function () {
  "use strict";

  var BAR_COUNT = 15;

  /* Alturas iniciais em svh, por índice de coluna (as do CSS original
     da referência). O resto das colunas parte de 100svh. */
  var START_SVH = { 0: 44.44, 1: 66.67, 2: 88.89, 12: 88.89, 13: 66.67, 14: 44.44 };

  function initHeroBars() {
    var hero = document.querySelector(".hero");
    if (!hero) return;

    buildBars(hero.querySelector(".hero__bars"));
    syncHeaderHeight(hero);

    /* Sem fechamento não há motivo para o trilho extra de rolagem. */
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !window.gsap || !window.ScrollTrigger) {
      hero.classList.add("hero--static");
    }

    if (reduced || !window.gsap) return;
    initMotion(hero);
  }

  /*
   * As 15 colunas são geradas em JS de propósito: são decorativas, e 45
   * elementos vazios no HTML só pesariam a leitura do documento sem
   * acrescentar nada semanticamente. O container já é aria-hidden.
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

  /*
   * A camada presa começa logo abaixo do header, então precisa saber a
   * altura dele. O CSS tem um fallback de 80px para o caso de este
   * script não rodar.
   */
  function syncHeaderHeight(hero) {
    var header = document.getElementById("site-header");
    if (!header) return;

    var apply = function () {
      hero.style.setProperty("--hd", header.offsetHeight + "px");
    };

    apply();

    var timer = 0;
    window.addEventListener(
      "resize",
      function () {
        window.clearTimeout(timer);
        timer = window.setTimeout(function () {
          apply();
          if (window.ScrollTrigger) window.ScrollTrigger.refresh();
        }, 150);
      },
      { passive: true }
    );
  }

  /* 1svh em pixels. Medido de verdade, porque em iOS o svh difere do
     innerHeight enquanto a barra do navegador está recolhida. */
  function svhToPx() {
    var probe = document.createElement("div");
    probe.style.cssText = "position:absolute;visibility:hidden;height:100svh;pointer-events:none";
    document.body.appendChild(probe);
    var px = probe.offsetHeight || window.innerHeight;
    probe.remove();
    return px / 100;
  }

  function initMotion(hero) {
    var gsap = window.gsap;
    var unit = svhToPx();

    var ctx = gsap.context(function () {
      var bars = gsap.utils.toArray(".bar");

      /* ---------- entrada ---------- */
      var intro = gsap.timeline({ defaults: { ease: "power3.out" } });

      /*
       * A referência anima `height` de verdade. Aqui é scaleY, por um
       * motivo medido: animar a altura de 15 elementos de milhares de
       * pixels dispara layout a cada frame, e o Lighthouse acusou
       * CLS 2,25. scaleY roda no compositor e dá CLS zero.
       *
       * O resultado na tela é idêntico: o gradiente é background-image,
       * então escala junto com a caixa — uma coluna de altura H com
       * stops em % e scaleY(k) desenha o mesmo que uma coluna de altura
       * H*k.
       *
       * A razão vem da altura real já calculada pelo CSS, então continua
       * correta se --ramp mudar ou no breakpoint do mobile.
       */
      intro
        .from(
          bars,
          {
            scaleY: function (i, el) {
              var finalH = el.getBoundingClientRect().height;
              if (!finalH) return 1;
              return ((START_SVH[i] || 100) * unit) / finalH;
            },
            transformOrigin: "center",
            duration: 1.1,
            stagger: { each: 0.03, from: "center" },
          },
          0
        )
        .from(".hero__bars", { opacity: 0, duration: 0.6, ease: "none" }, 0)
        .from(
          ".bar__top",
          {
            "--blue-stop": "63%",
            "--black-stop": "100%",
            duration: 1.1,
            stagger: { each: 0.03, from: "center" },
            onComplete: function () {
              gsap.set(".bar__top", { clearProps: "--blue-stop,--black-stop" });
            },
          },
          0
        )
        .from(
          ".bar__bottom",
          {
            "--blue-stop": "37%",
            "--black-stop": "0%",
            duration: 1.1,
            stagger: { each: 0.03, from: "center" },
            onComplete: function () {
              gsap.set(".bar__bottom", { clearProps: "--blue-stop,--black-stop" });
            },
          },
          0
        )
        /* Headline: cada linha sobe de dentro da própria janela de
           overflow. Sem SplitText (plugin pago) — a divisão por linha
           está no markup. */
        .from(".hero__line-inner", { yPercent: 100, duration: 0.9, stagger: 0.08 }, 0.25)
        .from(
          [".hero__eyebrow", ".hero__note"],
          { y: 14, opacity: 0, duration: 0.7, stagger: 0.1 },
          0.35
        );

      /* Aba em segundo plano não precisa animar. */
      document.addEventListener("visibilitychange", function () {
        if (document.hidden) intro.pause();
        else intro.resume();
      });

      /* ---------- fechamento preso ao scroll ---------- */
      if (!window.ScrollTrigger) return;
      gsap.registerPlugin(window.ScrollTrigger);

      /*
       * O scaleY do fechamento vai no CONTÊINER, não em cada coluna.
       * Dois motivos: é o que a medição mostra (fator único para todas
       * as colunas, razões constantes entre elas), e evita que este
       * tween e o da entrada disputem a mesma propriedade no mesmo
       * elemento se o usuário rolar durante a abertura.
       *
       * start/end cobrem exatamente o curso em que .hero__sticky fica
       * presa: o trilho tem 100svh a mais que a camada.
       */
      gsap
        .timeline({
          scrollTrigger: {
            /* O elemento, não o seletor: dentro de um gsap.context() com
               escopo em `hero`, ".hero" seria procurado entre os
               DESCENDENTES dele e nunca resolveria. */
            trigger: hero,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.4,
          },
        })
        .to(
          ".hero__bars",
          { scaleY: 0, transformOrigin: "center", ease: "power2.out", duration: 1 },
          0
        )
        /* O texto sai antes das barras terminarem de fechar, como na
           referência: em ~70% do curso ele já sumiu. */
        .to(".hero__content", { opacity: 0, ease: "power1.in", duration: 0.7 }, 0);
    }, hero);

    window.DGAtivosHero = {
      destroy: function () {
        ctx.revert();
      },
    };
  }

  document.addEventListener("DOMContentLoaded", initHeroBars);
})();
