/*
 * Efeitos de texto — portados da landing da Rare Tech.
 *
 * Dois efeitos, ligados por atributo no HTML:
 *
 *   [data-split]         entrada: o texto é quebrado em LINHAS reais e
 *                        cada uma sobe de dentro da própria janela, em
 *                        cascata.
 *   [data-scramble]      hover: o texto vira um anagrama de si mesmo e
 *                        se resolve da esquerda para a direita.
 *   [data-scramble-once] o mesmo scramble, disparado uma vez quando o
 *                        elemento entra na tela.
 *   data-scramble-lock="N"  mantém os N primeiros caracteres parados
 *                        (para prefixos tipo "01 " que não devem mexer).
 *
 * DIFERENÇA EM RELAÇÃO AO ORIGINAL: lá a revelação é feita com
 * GSAP/ScrollTrigger. Aqui é IntersectionObserver + transição de CSS,
 * porque este módulo também roda na home, que não carrega o GSAP —
 * puxar 116 KB de biblioteca para animar títulos não se paga. O
 * desenho (0.9s, cascata de 90ms, power3.out) é o mesmo.
 *
 * Sem JS nada disto existe: a quebra em linhas é criada pelo próprio
 * script, então o texto fica simplesmente visível e legível.
 */
(function () {
  "use strict";

  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var FINE_HOVER = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* Intervalo entre travar um caractere e o próximo, no scramble. */
  var SCRAMBLE_MS = 35;

  /* ================================================================
     SCRAMBLE
     ================================================================ */

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = (Math.random() * (i + 1)) | 0;
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  /*
   * O embaralhado usa as LETRAS DO PRÓPRIO TEXTO, não caracteres
   * aleatórios: o bloco continua parecendo a palavra final o tempo todo,
   * o que é bem menos agressivo que o efeito "matrix".
   */
  function scramble(el, lockStart, force) {
    if (REDUCED) return;

    if (el.dataset.running) {
      if (!force) return;
      window.clearInterval(el._scrambleId);
      delete el.dataset.running;
    }

    el.style.width = "";
    el.style.height = "";

    var final = el.dataset.text || (el.dataset.text = el.textContent);
    if (final.length < 2) return;

    lockStart = lockStart || 0;
    el.dataset.running = "1";

    /*
     * Trava a caixa antes de começar. Com fonte proporcional cada
     * anagrama tem uma largura diferente, e sem isto o elemento treme e
     * empurra o que estiver ao lado a cada quadro.
     */
    var lockW = el.offsetWidth;
    var lockH = el.offsetHeight;
    if (lockW) {
      el.style.width = lockW + "px";
      el.style.height = lockH + "px";
    }

    var pool = final.slice(lockStart).replace(/\s/g, "").split("");
    var locked = lockStart;

    var id = (el._scrambleId = window.setInterval(function () {
      var rest = shuffle(pool.slice());
      var k = 0;

      el.textContent = final
        .split("")
        .map(function (c, i) {
          if (c === " ") return " ";
          if (i < locked) return final[i];
          return rest[k++] || c;
        })
        .join("");

      if (++locked > final.length) {
        window.clearInterval(id);
        /* data-text é a fonte da verdade: o texto final vem dele, nunca
           do que sobrou no DOM. */
        el.textContent = final;
        el.style.width = "";
        el.style.height = "";
        delete el.dataset.running;
      }
    }, SCRAMBLE_MS));
  }

  function lockOf(el) {
    return parseInt(el.getAttribute("data-scramble-lock") || "0", 10);
  }

  function initScrambleHover() {
    /* Só em ponteiro fino: no toque não existe "entrar com o mouse", e o
       efeito ficaria preso no primeiro tap. */
    if (!FINE_HOVER || REDUCED) return;

    document.querySelectorAll("[data-scramble]").forEach(function (el) {
      el.dataset.text = el.textContent;
      var lock = lockOf(el);
      el.addEventListener("mouseenter", function () {
        scramble(el, lock);
      });
    });
  }

  /* ================================================================
     QUEBRA EM LINHAS
     ================================================================ */

  function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /*
   * Transforma o conteúdo em uma lista de palavras, preservando os
   * elementos inline (<strong>, <b>...) e marcando os <br>.
   *
   * `glue` existe para não separar em duas "palavras" o que o HTML
   * escreveu grudado — por exemplo `<strong>24 horas</strong>.`, em que o
   * ponto final pertence à palavra anterior.
   */
  function tokenize(el) {
    var tokens = [];
    var glue = false;

    function push(html, canGlue) {
      if (canGlue && tokens.length && tokens[tokens.length - 1].type === "word") {
        tokens[tokens.length - 1].html += html;
      } else {
        tokens.push({ type: "word", html: html });
      }
    }

    Array.prototype.forEach.call(el.childNodes, function (node) {
      if (node.nodeType === 3) {
        var raw = node.nodeValue;
        raw.split(/(\s+)/).forEach(function (p) {
          if (!p) return;
          if (/^\s+$/.test(p)) {
            glue = false;
            return;
          }
          push(esc(p), glue);
          glue = true;
        });
        if (/\s$/.test(raw)) glue = false;
        return;
      }

      if (node.nodeType !== 1) return;

      /* <br> vira um marcador de quebra: sem isto a quebra manual do
         HTML se perderia e o texto seria remontado só pela medição. */
      if (node.tagName === "BR") {
        tokens.push({ type: "br" });
        glue = false;
        return;
      }

      /* O elemento inline também é dividido em palavras — senão um
         <strong> longo nunca quebraria de linha. */
      var cls = node.getAttribute("class");
      var tag = node.tagName.toLowerCase();
      var open = "<" + tag + (cls ? ' class="' + cls + '"' : "") + ">";
      var close = "</" + tag + ">";
      var txt = node.textContent;

      txt.split(/(\s+)/).forEach(function (p) {
        if (!p) return;
        if (/^\s+$/.test(p)) {
          glue = false;
          return;
        }
        push(open + esc(p) + close, glue);
        glue = true;
      });
      if (/\s$/.test(txt)) glue = false;
    });

    return tokens;
  }

  /*
   * Agrupa as palavras em linhas pela posição vertical REAL depois de
   * renderizadas. É o que faz a quebra acompanhar a largura da tela, a
   * fonte que carregou e o zoom do usuário, em vez de um palpite.
   */
  function splitLines(el) {
    if (!el.dataset.original) el.dataset.original = el.innerHTML;
    else el.innerHTML = el.dataset.original;

    var tokens = tokenize(el);
    if (!tokens.length) return [];

    el.innerHTML = tokens
      .map(function (t) {
        return t.type === "br" ? "<br>" : '<span class="w">' + t.html + "</span>";
      })
      .join(" ");

    var words = Array.prototype.slice.call(el.querySelectorAll(":scope > .w"));
    var wordTokens = tokens.filter(function (t) {
      return t.type === "word";
    });

    var lines = [];
    var currentTop = null;

    words.forEach(function (w, i) {
      var top = Math.round(w.offsetTop);
      if (currentTop === null || Math.abs(top - currentTop) > 2) {
        lines.push([]);
        currentTop = top;
      }
      lines[lines.length - 1].push(wordTokens[i].html);
    });

    el.innerHTML = lines
      .map(function (l, i) {
        return (
          '<span class="line-mask"><span class="split-line" style="--i:' +
          i +
          '">' +
          l.join(" ") +
          "</span></span>"
        );
      })
      .join("");

    return Array.prototype.slice.call(el.querySelectorAll(".split-line"));
  }

  /* ================================================================
     ENTRADA
     ================================================================ */

  var splitTargets = [];
  var io = null;

  function buildSplits() {
    splitTargets.forEach(function (el) {
      /* Já revelado: remonta as linhas na largura nova, mas sem esconder
         de novo — reanimar o que o usuário já leu é ruído. */
      var done = el.dataset.revealed === "1";
      splitLines(el);
      if (done) el.classList.add("is-in");
    });
  }

  function initSplit() {
    splitTargets = Array.prototype.slice.call(document.querySelectorAll("[data-split]"));
    if (!splitTargets.length) return;

    if (REDUCED) {
      /* Sem movimento: quebra em linhas mesmo assim (o desenho do texto
         continua igual) e mostra tudo. */
      splitTargets.forEach(function (el) {
        splitLines(el);
        el.dataset.revealed = "1";
        el.classList.add("is-in");
      });
      return;
    }

    buildSplits();

    io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.dataset.revealed = "1";
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        });
      },
      /* -12% embaixo: a linha começa a subir quando o bloco já entrou
         de verdade, não no instante em que encosta na borda. */
      { rootMargin: "0px 0px -12% 0px" }
    );

    splitTargets.forEach(function (el) {
      io.observe(el);
    });
  }

  function initScrambleOnce() {
    var els = document.querySelectorAll("[data-scramble-once]");
    if (!els.length || REDUCED) return;

    var obs = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          scramble(entry.target, lockOf(entry.target));
          obs.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -15% 0px" }
    );

    els.forEach(function (el) {
      el.dataset.text = el.textContent;
      obs.observe(el);
    });
  }

  /* ================================================================
     INIT
     ================================================================ */

  function init() {
    initSplit();
    initScrambleHover();
    initScrambleOnce();

    /*
     * A quebra depende da métrica da fonte. Enquanto a SF Pro não
     * resolve, a medição sai pela fonte de fallback e as linhas podem
     * ficar erradas — daí o recorte na hora que as fontes ficam prontas.
     */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(buildSplits);
    }

    var timer = 0;
    window.addEventListener(
      "resize",
      function () {
        window.clearTimeout(timer);
        timer = window.setTimeout(buildSplits, 200);
      },
      { passive: true }
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
