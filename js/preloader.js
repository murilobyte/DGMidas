/*
 * Preloader do site — usado na home e em /ativos.
 *
 * Sem GSAP de propósito: a home não carrega o GSAP, e puxar 116 KB de
 * biblioteca só para animar um contador não se paga. Aqui é
 * requestAnimationFrame para o número e uma transição de CSS para a
 * saída.
 *
 * QUEM DECIDE SE A CORTINA APARECE não é este arquivo: é o script
 * inline no <head> de cada página, que precisa rodar antes da primeira
 * pintura. Ele mostra a cortina apenas na primeira visita da sessão
 * (sessionStorage) e nunca com prefers-reduced-motion, marcando o
 * <html> com a classe .is-loading. Aqui só animamos o que ele ligou.
 *
 * Para voltar a exibir em todo carregamento, como no site de
 * referência, basta remover as duas linhas de sessionStorage daquele
 * script inline.
 */
(function () {
  "use strict";

  /* Tempo mínimo em tela, para a cortina não "piscar" em cache quente. */
  var MIN_MS = 1100;
  /* Teto enquanto a página ainda não terminou de carregar: o contador
     nunca finge que chegou ao fim antes da hora. */
  var CEILING_BEFORE_LOAD = 92;

  function init() {
    var el = document.getElementById("preloader");
    if (!el) return;

    var root = document.documentElement;
    var pctEl = el.querySelector(".preloader__pct");
    var lineEl = el.querySelector(".preloader__line");

    var finish = function () {
      el.classList.add("is-done");
      root.classList.remove("is-loading");

      /* Tira do DOM depois da transição para não deixar uma camada
         fixa de tela cheia interceptando nada. O timeout é a garantia
         de que isso acontece mesmo se o transitionend não disparar
         (aba em segundo plano, por exemplo). */
      var remove = function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      };
      el.addEventListener("transitionend", remove, { once: true });
      window.setTimeout(remove, 1400);
    };

    /*
     * A cortina não foi ligada (visita seguinte da sessão, menos
     * movimento, ou JS parcialmente bloqueado): não há nada a animar.
     * Tira o nó do DOM e sai — ele está em display:none, mas deixar uma
     * camada de tela cheia pendurada não ajuda ninguém.
     */
    if (!root.classList.contains("is-loading")) {
      if (el.parentNode) el.parentNode.removeChild(el);
      return;
    }

    var loaded = document.readyState === "complete";
    window.addEventListener("load", function () {
      loaded = true;
    });

    var start = performance.now();
    var shown = 0;

    function frame(now) {
      var elapsed = now - start;

      /*
       * O alvo é o progresso real: 100 quando a página terminou de
       * carregar E o tempo mínimo passou; antes disso ele sobe
       * assintoticamente até o teto, sem nunca bater nele. É o que
       * evita as duas mentiras clássicas — travar em 99% ou saltar de
       * 20% para 100%.
       */
      var target;
      if (loaded && elapsed >= MIN_MS) {
        target = 100;
      } else {
        var t = elapsed / 2200;
        target = CEILING_BEFORE_LOAD * (1 - Math.exp(-3 * t));
      }

      /* Suavização exponencial: o número persegue o alvo em vez de
         saltar quando o evento de load chega de uma vez. */
      shown += (target - shown) * 0.12;

      if (target === 100 && 100 - shown < 0.4) shown = 100;

      var v = Math.min(100, Math.round(shown));
      if (pctEl) pctEl.textContent = v + "%";
      if (lineEl) lineEl.style.width = v + "%";

      if (shown >= 100) {
        window.setTimeout(finish, 220);
        return;
      }

      window.requestAnimationFrame(frame);
    }

    window.requestAnimationFrame(frame);
  }

  /* Roda o quanto antes: em `defer` o DOM já está montado. */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
