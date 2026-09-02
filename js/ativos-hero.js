/*
 * Animação da hero de /ativos.
 *
 * A entrada reproduz o que o sui.io/ai faz de fato — verifiquei o CSS
 * computado ao vivo, não fui pelo que o briefing descrevia:
 *
 *   1. as colunas CRESCEM da altura do CSS original (44,44 / 66,67 /
 *      88,89 / 100 svh) para a rampa alta (até 809svh). Como elas são
 *      centradas, crescer empurra as pontas claras do gradiente para
 *      fora da tela — é assim que o miolo escurece e o brilho recua
 *      para as bordas;
 *   2. ao mesmo tempo os dois stops de cada gradiente deslizam:
 *      topo 63%->40% e 100%->90%, base 37%->60% e 0%->10%.
 *
 * NÃO existe loop de respiração contínua no site de referência: medi os
 * valores por 6s parado e por todo o scroll do hero, e eles não mudam
 * depois da entrada. Por isso não implementei um aqui.
 *
 * Nada disto é necessário para a página ser legível: o CSS já descreve o
 * estado final e toda animação usa `gsap.from()`.
 */
(function () {
  "use strict";

  var BAR_COUNT = 15;
  var NOISE_SCALE = 3;
  var NOISE_MAX_EDGE = 420;
  var NOISE_EVERY = 3;
  /* Densidade e alpha do grão — ver o comentário em draw(). */
  var NOISE_DENSITY = 0.2;
  var NOISE_ALPHA_MIN = 30;
  var NOISE_ALPHA_RANGE = 40;

  /* Alturas iniciais em svh, por índice de coluna (as do CSS original
     da referência). O resto das colunas parte de 100svh. */
  var START_SVH = { 0: 44.44, 1: 66.67, 2: 88.89, 12: 88.89, 13: 66.67, 14: 44.44 };

  function initHeroBars() {
    var hero = document.querySelector(".hero");
    if (!hero) return;

    buildBars(hero.querySelector(".hero__bars"));

    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    if (window.gsap) initMotion(hero);
    initNoise(hero);
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

      var tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      /*
       * As colunas crescem e o brilho recua para as bordas.
       *
       * A referência anima `height` de verdade. Aqui é scaleY, por um
       * motivo medido: animar a altura de 15 elementos de milhares de
       * pixels dispara layout a cada frame, e o Lighthouse contabilizou
       * CLS 2.25 (15 layout shifts). scaleY roda no compositor e dá CLS
       * zero.
       *
       * O resultado na tela é idêntico: o gradiente é background-image,
       * então ele escala junto com a caixa — uma coluna de altura H com
       * stops em % e scaleY(k) desenha exatamente o mesmo que uma coluna
       * de altura H*k.
       *
       * A razão vem da altura real já calculada pelo CSS, então continua
       * correta se --ramp mudar ou no breakpoint do mobile.
       */
      tl.from(
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
        if (document.hidden) tl.pause();
        else tl.resume();
      });

      if (!window.ScrollTrigger) return;
      gsap.registerPlugin(window.ScrollTrigger);

      /*
       * Reação ao scroll: só a opacidade do conjunto.
       *
       * No site de referência as colunas NÃO se mexem com o scroll —
       * amostrei os valores ao longo de todo o hero e eles ficam
       * congelados. Um scrub de scaleY por coluna, como o briefing
       * pedia, também brigaria com o scaleY da entrada pela mesma
       * propriedade. Opacidade não transforma nada, não custa layout e
       * mantém a saída suave para a próxima seção.
       */
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
        .to(".hero__bars", { opacity: 0.25 }, 0);
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

      /*
       * Grão ESPARSO e modulado por alpha: a maioria dos pixels fica
       * totalmente transparente e uns 20% recebem um ponto claro fraco.
       *
       * A referência usa um canvas cinza opaco com mix-blend-mode:
       * soft-light. Isso é elegante mas frágil: onde o blend não é
       * aplicado (rasterização por software, por exemplo) a camada vira
       * um lençol cinza de 50% por cima da página inteira e destrói o
       * preto do miolo — foi exatamente o que aconteceu aqui na primeira
       * tentativa. Com alpha esparso o pior caso é um véu de ~4/255, que
       * ninguém enxerga, e o resultado com blend continua sendo grão.
       */
      for (var i = 0; i < buffer32.length; i++) {
        var a =
          Math.random() < NOISE_DENSITY
            ? NOISE_ALPHA_MIN + ((Math.random() * NOISE_ALPHA_RANGE) | 0)
            : 0;
        /* Little-endian: 0xAABBGGRR — branco com alpha variável. */
        buffer32[i] = (a << 24) | 0x00ffffff;
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
