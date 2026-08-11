/*
 * Formulário de contato dos botões laranja.
 *
 * Fluxo: abre o modal -> envia os dados para a planilha -> abre o WhatsApp.
 * Cole abaixo a URL do Web App do Apps Script (passo a passo em
 * docs/google-sheets.md). Enquanto estiver vazia, o formulário continua
 * levando ao WhatsApp — só não registra na planilha.
 */
const SHEETS_ENDPOINT = "https://script.google.com/macros/s/AKfycbyKU15bk4LYy97covqOR5CozsEnGKv0WgQwnjWnpqunXQK5dlZy4pLXyxKQKd4I2G7oSw/exec";
const WHATSAPP_NUMBER = "5537998157790";

function initLeadModal() {
  const modal = document.getElementById("lead-modal");
  const form = document.getElementById("lead-form");
  if (!modal || !form) return;

  const errorEl = form.querySelector(".lead-form__error");
  let lastTrigger = null;

  const open = (trigger) => {
    lastTrigger = trigger;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    form.querySelector("input")?.focus();
  };

  const close = () => {
    modal.hidden = true;
    document.body.style.overflow = "";
    errorEl.textContent = "";
    lastTrigger?.focus();
  };

  // Todo botão laranja abre o modal, menos o de envio do próprio form.
  document.querySelectorAll(".btn--primary:not(.lead-form__submit)").forEach(
    (btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        open(btn);
      });
    }
  );

  modal.querySelectorAll("[data-close]").forEach((el) => {
    el.addEventListener("click", close);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) close();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const data = new FormData(form);
    const nome = data.get("nome").trim();
    const telefone = data.get("telefone").trim();
    const email = data.get("email").trim();

    if (!nome || !telefone || !email) {
      errorEl.textContent = "Preencha todos os campos.";
      return;
    }

    sendToSheet({ nome, telefone, email });

    const message = `Olá, meu nome é ${nome}. E quero aumentar minhas vendas!`;
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

    form.reset();
    close();
    window.open(url, "_blank", "noopener");
  });
}

/*
 * sendBeacon enfileira o envio no navegador e sobrevive à troca de página
 * para o WhatsApp — um fetch comum poderia ser cancelado no meio.
 */
function sendToSheet(fields) {
  if (!SHEETS_ENDPOINT) return;

  const payload = new URLSearchParams({
    ...fields,
    origem: window.location.href,
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon(SHEETS_ENDPOINT, payload);
    return;
  }

  fetch(SHEETS_ENDPOINT, {
    method: "POST",
    mode: "no-cors",
    body: payload,
  }).catch(() => {
    /* o lead segue para o WhatsApp mesmo se a planilha falhar */
  });
}

document.addEventListener("DOMContentLoaded", initLeadModal);
