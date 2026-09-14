/*
 * Configuração da página /ativos: contato, links de WhatsApp e analytics.
 *
 * O site é HTML estático, sem bundler — não há `import`/`export`. O
 * briefing pedia `export const wa`, então o equivalente aqui é um
 * namespace único em `window.DGAtivos`, carregado antes dos demais
 * scripts da página. Mesmo contrato, sem build step.
 *
 * ================================================================
 * CONSTANTES A CONFERIR / PREENCHER
 * ================================================================
 * WHATSAPP_NUMBER  já preenchido — veio de js/lead-modal.js, que é o
 *                  número em produção hoje. Confirmar se o atendimento
 *                  de ativos usa este mesmo número ou um dedicado.
 * PHONE_DISPLAY    idem: o texto que aparece no rodapé.
 * OG_IMAGE         [X] a imagem de compartilhamento própria da página
 *                  ainda não existe. Ver a lista de pendências no topo
 *                  de ativos/index.html.
 * ================================================================
 */
window.DGAtivos = (function () {
  "use strict";

  /* Número usado em todos os links wa.me e no tel: do rodapé. */
  var WHATSAPP_NUMBER = "5537991391582";
  var PHONE_DISPLAY = "+55 37 99139-1582";
  var PHONE_TEL = "+5537991391582";

  /*
   * Uma mensagem por origem. É o que permite ler no WhatsApp qual bloco
   * da página converteu — com preço sob consulta, o WhatsApp é o
   * checkout, então a origem é o dado de funil mais importante que
   * temos.
   *
   * As chaves são as mesmas usadas no atributo data-wa do HTML.
   */
  var WA_MESSAGES = {
    hero: "Olá! Vim pelo site e quero falar sobre ativos para tráfego pago.",
    "bm-facebook": "Olá! Quero consultar disponibilidade de BM do Facebook.",
    "bm-disparo": "Olá! Quero consultar as faixas de limite de BM para disparo.",
    google: "Olá! Quero consultar disponibilidade de conta Google Ads.",
    tiktok: "Olá! Quero consultar disponibilidade de conta TikTok Ads.",
    perfis: "Olá! Quero consultar disponibilidade de perfis.",
    /* Sem seção de garantia na página hoje; a chave fica pronta para
       quando ela entrar. */
    garantia: "Olá! Tenho uma dúvida sobre a garantia de troca.",
    suporte: "Olá! Preciso de suporte.",
    "cta-final": "Olá! Quero receber disponibilidade e orçamento.",
    flutuante: "Olá! Vim pelo site de ativos.",
  };

  /* Helper único de link. Toda a página passa por aqui. */
  function wa(msg) {
    return (
      "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(msg)
    );
  }

  /* Link a partir da chave de origem, com queda para a mensagem da hero
     se alguém escrever um data-wa que não existe no mapa. */
  function waFrom(origin) {
    return wa(WA_MESSAGES[origin] || WA_MESSAGES.hero);
  }

  /*
   * O site ainda não tem GTM nem gtag instalado. Em vez de escolher um
   * por conta própria, o evento é empurrado para o dataLayer (que o GTM
   * consome assim que for instalado) e repassado ao gtag se ele existir.
   * Enquanto não houver nenhum dos dois, isto é um no-op silencioso — e
   * nenhum clique deixa de funcionar por causa disso.
   *
   * O Meta Pixel, esse já está instalado (no <head> da página). Aqui o
   * clique vira um `Contact`: nesta página o preço é sob consulta, então
   * abrir a conversa no WhatsApp é a conversão — não há formulário nem
   * checkout depois dele. A origem vai junto em content_name para dar
   * para separar no Gerenciador qual bloco converteu.
   *
   * O guard em fbq não é paranoia: se um bloqueador de anúncios impedir
   * o fbevents.js de carregar, `fbq` não existe e o clique tem de
   * continuar levando a pessoa ao WhatsApp do mesmo jeito.
   */
  function track(origin) {
    var payload = {
      event: "whatsapp_click",
      origem: origin,
      pagina: "/ativos",
    };

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);

    if (typeof window.gtag === "function") {
      window.gtag("event", "whatsapp_click", {
        origem: origin,
        pagina: "/ativos",
      });
    }

    if (typeof window.fbq === "function") {
      window.fbq("track", "Contact", {
        content_name: origin,
        content_category: "ativos",
      });
    }
  }

  return {
    WHATSAPP_NUMBER: WHATSAPP_NUMBER,
    PHONE_DISPLAY: PHONE_DISPLAY,
    PHONE_TEL: PHONE_TEL,
    WA_MESSAGES: WA_MESSAGES,
    wa: wa,
    waFrom: waFrom,
    track: track,
  };
})();
