/* Contatos da referência. Confirme os dados cadastrais e preencha a URL antes da publicação pública. */
const CONFIG = {
  numeroWhatsApp: "5541988682957",
  telefoneExibicao: "(41) 98868-2957",
  emailExibicao: "editalpublicidadelegal@gmail.com",
  cnpj: "37.480.691/0001-88",
  nomeEmpresa: "CR Assessoria e Publicidade",
  urlSite: "https://www.exemplo.com.br/",
  mensagemPadraoWhatsApp: "Olá, preciso de orçamento para publicação de edital.",
  // Use o endpoint AJAX do Formspree, Web3Forms ou FormSubmit.
  emailEndpoint: "",
  // Web3Forms: access_key pública de formulário. FormSubmit: _subject ou alias no endpoint.
  // Formspree: use o ID do formulário na URL e configure os campos conforme a conta.
  emailExtras: {},
  mensagemErro: "O e-mail não foi enviado. Continue no WhatsApp para concluir o pedido.",
};

// Retângulo do estado em porcentagens do PNG original de 2048 × 2048.
const MAPA_LIMITES = { esquerda:0, topo:0, largura:100, altura:100 };

function track(event, details = {}) {
  if (Array.isArray(window.dataLayer)) window.dataLayer.push({ event, ...details });
}

function whatsappUrl(message) {
  return "https://wa.me/" + CONFIG.numeroWhatsApp + "?text=" + encodeURIComponent(message);
}

const params = new URLSearchParams(location.search);
const campaignKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid"];
const campaign = Object.fromEntries(campaignKeys.map((key) => {
  const current = params.get(key) || "";
  try {
    const saved = sessionStorage.getItem("cr-" + key);
    if (saved !== null) return [key, saved];
    if (current) sessionStorage.setItem("cr-" + key, current);
  } catch { /* A URL ainda funciona quando o armazenamento está indisponível. */ }
  return [key, current];
}));

function saoPauloISO(date) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", timeZoneName: "longOffset",
  }).formatToParts(date).map(({ type, value }) => [type, value]));
  return parts.year + "-" + parts.month + "-" + parts.day + "T" +
    parts.hour + ":" + parts.minute + ":" + parts.second + parts.timeZoneName.replace(/^GMT/, "").replace("−", "-");
}

const phoneHref = "tel:+55" + CONFIG.telefoneExibicao.replace(/\D/g, "");
const dados = { telefone: CONFIG.telefoneExibicao, email: CONFIG.emailExibicao, cnpj: CONFIG.cnpj };
document.querySelectorAll("[data-dado]").forEach((node) => {
  node.textContent = dados[node.dataset.dado];
});
document.querySelectorAll('[data-contato="telefone"]').forEach((link) => {
  link.href = phoneHref;
  link.addEventListener("click", () => track("phone_click"));
});
document.querySelectorAll('[data-contato="email"]').forEach((link) => {
  link.href = "mailto:" + CONFIG.emailExibicao;
});
document.querySelector(".phone")?.setAttribute("aria-label", "Ligar para " + CONFIG.telefoneExibicao);
document.querySelectorAll("[data-ano]").forEach((node) => {
  node.textContent = new Date().getFullYear();
});
const serviceData = document.querySelector("#dados-cr");
if (serviceData) {
  const schema = JSON.parse(serviceData.textContent);
  serviceData.textContent = JSON.stringify({ ...schema, name: CONFIG.nomeEmpresa, telephone: phoneHref.slice(4), email: CONFIG.emailExibicao, url: CONFIG.urlSite });
  document.querySelector('link[rel="canonical"]').href = CONFIG.urlSite;
  document.querySelector('meta[property="og:url"]').content = CONFIG.urlSite;
}

for (const link of document.querySelectorAll(".whatsapp")) {
  const origem = link.dataset.whatsapp;
  const message = origem === "chamada_final"
    ? "Olá, o despacho determinou publicação em jornal e preciso de orçamento. Edital de [tipo] em [comarca]."
    : CONFIG.mensagemPadraoWhatsApp;
  const text = origem === "flutuante"
    ? "Olá, vim pelo site e preciso de orçamento para publicação de edital em jornal."
    : message;
  link.href = whatsappUrl(text);
  link.addEventListener("click", () => track("whatsapp_click", origem ? { origem } : {}));
}

function scrollToQuote(card, field) {
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  card.scrollIntoView({ behavior: reducedMotion ? "instant" : "smooth" });
  field.focus({ preventScroll: true });
}

function maskPhone(value) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length < 3) return digits ? "(" + digits : "";
  const split = digits.length === 11 ? 7 : 6;
  const number = digits.slice(2, split);
  const ending = digits.slice(split);
  return "(" + digits.slice(0, 2) + ") " + number + (ending ? "-" + ending : "");
}

function fieldError(field, message) {
  document.getElementById(field.getAttribute("aria-describedby").split(" ")[0]).textContent = message;
  if (message) field.setAttribute("aria-invalid", "true");
  else field.removeAttribute("aria-invalid");
}

// Cada formulário tem seu próprio upload, mensagens e estado de envio.
function initFormulario(form) {
  const { nome, whatsapp, tipo, cidade, observacoes } = form.elements;
  const origem = form.elements.namedItem("origem").value;
  const card = form.closest(".card");
  const submit = form.querySelector("button[type=submit]");
  const status = form.querySelector(".status");
  const confirmation = card.querySelector(".form-sucesso");
  const tipoAjuda = document.getElementById(tipo.getAttribute("aria-describedby").split(" ")[1]);
  const continuar = confirmation.querySelector(".form-whatsapp");
  const outro = confirmation.querySelector(".form-outro");
  const confirmationText = confirmation.querySelector("p");
  let lockedUntil = 0;
  submit.disabled = false;
  for (const [name, value] of Object.entries(campaign)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.append(input);
  }
  continuar.addEventListener("click", () => track("whatsapp_click", { origem: "pos_envio" }));

  function syncOfficeFields() {
    const isOffice = tipo.value === "escritorio";
    tipoAjuda.hidden = !isOffice;
    observacoes.closest(".field").hidden = !isOffice;
    observacoes.disabled = !isOffice;
  }

  function applyParams() {
    const requestedType = params.get("tipo");
    if (Array.from(tipo.options).some((option) => option.value === requestedType)) tipo.value = requestedType;
    cidade.value = (params.get("cidade") || "").slice(0, cidade.maxLength);
    syncOfficeFields();
  }

  applyParams();
  tipo.addEventListener("change", syncOfficeFields);

  // Preserve the cursor when editing digits in the middle of the number.
  whatsapp.addEventListener("input", () => {
    const position = whatsapp.selectionStart ?? whatsapp.value.length;
    const digitsBefore = whatsapp.value.slice(0, position).replace(/\D/g, "").length;
    const atEnd = position === whatsapp.value.length;
    whatsapp.value = maskPhone(whatsapp.value);
    if (atEnd) return;
    let index = 0;
    let count = 0;
    for (const character of whatsapp.value) {
      if (count >= digitsBefore) break;
      if (/\d/.test(character)) count++;
      index++;
    }
    whatsapp.setSelectionRange(index, index);
  });

  for (const field of [nome, whatsapp, tipo, cidade]) {
    field.addEventListener(field === tipo ? "change" : "input", () => fieldError(field, ""));
  }

  function feedback(message, success = false) {
    status.textContent = message;
    status.classList.toggle("success", success);
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submit.disabled || form.hidden || Date.now() < lockedUntil || form.elements.namedItem("site").value.trim()) return;
    feedback("");
    const checks = [
      [nome, nome.value.trim() ? "" : "Informe seu nome."],
      [whatsapp, whatsapp.value.replace(/\D/g, "").length >= 10 ? "" : "Informe um WhatsApp com DDD e pelo menos 10 dígitos."],
      [tipo, tipo.value ? "" : "Selecione o tipo de edital."],
      [cidade, cidade.value.trim() ? "" : "Informe a comarca ou cidade."],
    ];
    for (const [field, error] of checks) fieldError(field, error);
    const invalid = checks.find(([, error]) => error)?.[0];
    if (invalid) {
      feedback("Revise os campos indicados para continuar.");
      track("form_error", { campo: invalid.name, origem });
      invalid.focus();
      return;
    }

    const typeLabel = tipo.selectedOptions[0].textContent;
    const submittedType = tipo.value;
    const comarca = cidade.value.trim();
    const nomePedido = nome.value.trim();
    lockedUntil = Date.now() + 10000;
    submit.disabled = true;
    form.setAttribute("aria-busy", "true");
    feedback("Enviando...", true);

    // Abrir durante o clique evita bloqueios. O WhatsApp exige confirmação do visitante.
    const popup = window.open("about:blank", "_blank");
    if (popup) {
      popup.opener = null;
      popup.document.body.textContent = "Preparando seu pedido…";
    }
    track("form_submit", { origem, tipo: submittedType });

    let mailSent = false;
    let mailFailed = false;
    if (CONFIG.emailEndpoint) {
      const payload = new FormData(form);
      payload.delete("site");
      payload.delete("cidade");
      for (const [key, value] of Object.entries(CONFIG.emailExtras)) payload.set(key, value);
      payload.set("nome", nomePedido);
      payload.set("tipo", typeLabel);
      payload.set("comarca", comarca);
      payload.set("pagina", location.href.split("#")[0]);
      payload.set("data_hora", saoPauloISO(new Date()));
      payload.set("_subject", "Novo orçamento: " + typeLabel + " – " + comarca);
      try {
        const response = await fetch(CONFIG.emailEndpoint, { method: "POST", body: payload, headers: { Accept: "application/json" }, signal: AbortSignal.timeout(15000) });
        if (!response.ok) throw new Error("Falha no envio");
        mailSent = true;
        track("form_success", { origem, tipo: submittedType });
      } catch {
        mailFailed = true;
        track("form_error", { campo: "envio", origem });
      }
    }

    const anexoWhatsApp = "Se tiver um despacho ou minuta, anexe o documento aqui no WhatsApp antes de enviar.";
    const message = [
      mailSent ? "Olá! Acabei de enviar um pedido de orçamento pelo site." : "Olá! Preenchi um pedido de orçamento pelo site.",
      "*Nome:* " + nomePedido,
      "*WhatsApp:* " + whatsapp.value,
      "*Tipo de edital:* " + typeLabel,
      "*Comarca/cidade:* " + comarca,
      "",
      anexoWhatsApp,
    ].join("\n");
    continuar.href = whatsappUrl(message);
    if (popup && !popup.closed) {
      popup.location.replace(continuar.href);
      track("whatsapp_click", { origem: "pos_envio" });
    }

    confirmationText.textContent = mailSent
      ? "Pedido enviado. Respondemos em dias úteis, em horário comercial."
      : (mailFailed ? CONFIG.mensagemErro : "Seu pedido está pronto. Continue no WhatsApp para enviá-lo.") +
        " Se tiver um despacho ou minuta, anexe o documento na conversa antes de enviar.";
    confirmation.hidden = false;
    form.hidden = true;
    form.removeAttribute("aria-busy");
    outro.disabled = Date.now() < lockedUntil;
    if (outro.disabled) setTimeout(() => { outro.disabled = false; }, Math.max(0, lockedUntil - Date.now()));
    confirmationText.focus();
  });

  outro.addEventListener("click", () => {
    if (Date.now() < lockedUntil) return;
    submit.disabled = false;
    form.reset();
    for (const field of [nome, whatsapp, tipo, cidade]) fieldError(field, "");
    feedback("");
    applyParams();
    confirmation.hidden = true;
    form.hidden = false;
    scrollToQuote(card, nome);
  });

  return {
    open({ type, city, focusName = false } = {}) {
      if (type) {
        tipo.value = type;
        fieldError(tipo, "");
        syncOfficeFields();
      }
      if (city) {
        cidade.value = city;
        fieldError(cidade, "");
      }
      const empty = [nome, whatsapp, tipo, cidade].find((field) => !field.value.trim());
      const field = form.hidden ? confirmation.querySelector("p") : (focusName ? nome : empty || submit);
      scrollToQuote(card, field);
    },
  };
}

const [bannerQuote, finalQuote] = [...document.querySelectorAll(".form-orcamento")].map(initFormulario);
const finalSection = document.querySelector("#chamada-final");
function finalInView() {
  if (!finalSection) return false;
  const bounds = finalSection.getBoundingClientRect();
  const headerBottom = document.querySelector(".topbar").getBoundingClientRect().bottom;
  return bounds.top < window.innerHeight && bounds.bottom > headerBottom;
}

if (finalSection) {
  const floating = document.querySelector(".floating");
  const areas = [...document.querySelectorAll("[data-evita-flutuante]")];
  const footer = document.querySelector("#rodape");
  const desktop = matchMedia("(min-width:1024px)");
  let footerVisible = false;
  let frame;
  function updateFloating() {
    frame = 0;
    const button = floating.getBoundingClientRect();
    const overlaps = areas.some((area) => {
      const rect = area.getBoundingClientRect();
      return rect.right > button.left && rect.left < button.right
        && rect.bottom > button.top && rect.top < button.bottom;
    });
    const hide = desktop.matches && footerVisible || overlaps;
    floating.classList.toggle("oculto-na-chamada", hide);
    floating.tabIndex = hide ? -1 : 0;
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(updateFloating);
  }
  window.addEventListener("scroll", schedule, { passive:true });
  window.addEventListener("resize", schedule);
  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(schedule);
    areas.forEach((area) => observer.observe(area));
    observer.observe(document.querySelector("main"));
  }
  if (footer && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(([entry]) => {
      footerVisible = entry.intersectionRatio >= .05;
      schedule();
    }, { threshold:.05 });
    observer.observe(footer);
  }
  schedule();
}

function quoteTarget(source) {
  if (source.closest(".hero")) return bannerQuote;
  return finalQuote && (source.closest("#chamada-final") || finalInView()) ? finalQuote : bannerQuote;
}

for (const link of document.querySelectorAll(".quote, #editais a[data-tipo]")) {
  link.addEventListener("click", (event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const { cta, tipo: type } = link.dataset;
    const isCard = Boolean(link.closest("#editais"));
    if (cta) track("cta_click", { section: cta });
    if (isCard) track("card_click", { tipo: type });
    const target = quoteTarget(link);
    target.open({ type, focusName: target === bannerQuote && !cta && !isCard });
  });
}

if (bannerQuote) {
  // O SVG contém apenas o contorno. As cidades da região de Curitiba compartilham o marcador.
  const mapa = document.querySelector(".cobertura-mapa");
  const camadaPontos = mapa.querySelector(".cobertura-pontos");
  const folha = document.querySelector('link[href="styles.css"]').sheet;
  const pontos = Array.from(document.querySelectorAll("#cobertura .chip"), (chip, index) => {
    const cluster = chip.closest('[aria-labelledby="regiao-curitiba"]');
    const ancora = cluster?.querySelector(".chip");
    if (ancora && ancora !== chip) return { chip };

    const x = MAPA_LIMITES.esquerda + Number(chip.dataset.x) * MAPA_LIMITES.largura / 100;
    const y = MAPA_LIMITES.topo + Number(chip.dataset.y) * MAPA_LIMITES.altura / 100;
    const ponto = document.createElement("span");
    ponto.id = "mapa-ponto-" + index;
    ponto.className = "cobertura-ponto";
    ponto.setAttribute("aria-hidden", "true");
    if (x > 74) ponto.classList.add("ponto-leste");
    if (x < 26) ponto.classList.add("ponto-oeste");
    const tooltip = document.createElement("span");
    tooltip.className = "cobertura-tooltip";
    tooltip.textContent = chip.dataset.cidade;
    ponto.append(tooltip);
    if (cluster) ponto.classList.add("ponto-cluster");
    if (chip.dataset.rotuloPos) {
      const rotulo = document.createElement("span");
      rotulo.className = "cobertura-rotulo";
      rotulo.dataset.posicao = chip.dataset.rotuloPos;
      rotulo.textContent = chip.dataset.cidade;
      ponto.append(rotulo);
    }
    camadaPontos.append(ponto);
    // CSSOM mantém as coordenadas em uma regra CSS, sem atributo style no HTML.
    folha.insertRule("#" + ponto.id + "{left:" + x + "%;top:" + y + "%}", folha.cssRules.length);
    return { chip, ponto, tooltip, x, y };
  });

  const curitiba = pontos.find(({ chip }) => chip.dataset.cidade === "Curitiba");
  for (const entrada of pontos) {
    if (!entrada.ponto) Object.assign(entrada, { ponto:curitiba.ponto, tooltip:curitiba.tooltip, x:curitiba.x, y:curitiba.y });
  }
  const marcadores = pontos.filter(({ ponto }, i) => pontos.findIndex((item) => item.ponto === ponto) === i);

  let pontoAtivo;
  function destacarPonto(entrada) {
    if (entrada === pontoAtivo) return;
    pontoAtivo?.chip.classList.remove("mapa-ativo");
    pontoAtivo?.ponto.classList.remove("mapa-ativo");
    pontoAtivo = entrada;
    pontoAtivo?.chip.classList.add("mapa-ativo");
    pontoAtivo?.ponto.classList.add("mapa-ativo");
    if (entrada) entrada.tooltip.textContent = entrada.chip.dataset.cidade;
  }

  const nomeNormalizado = (valor) => valor.trim().normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const pontoInicial = pontos.find(({ chip }) => nomeNormalizado(chip.dataset.cidade) === nomeNormalizado(params.get("cidade") || ""));
  if (pontoInicial) {
    pontoInicial.ponto.classList.add("mapa-selecionado");
    pontoInicial.chip.classList.add("mapa-selecionado");
  }

  for (const entrada of pontos) {
    const { chip } = entrada;
    chip.addEventListener("pointerenter", () => destacarPonto(entrada));
    chip.addEventListener("pointerleave", () => {
      if (document.activeElement !== chip) destacarPonto();
    });
    chip.addEventListener("focus", () => destacarPonto(entrada));
    chip.addEventListener("blur", () => destacarPonto());
    chip.addEventListener("click", () => {
      track("comarca_click", { cidade: chip.dataset.cidade });
      quoteTarget(chip).open({ city: chip.dataset.cidade });
    });
  }

  // Em grupos densos, o ponto mais próximo recebe o toque dentro de um raio de 16 px.
  function pontoMaisProximo(evento) {
    const area = mapa.getBoundingClientRect();
    const x = evento.clientX - area.left;
    const y = evento.clientY - area.top;
    let menor = 16;
    let resultado;
    for (const entrada of marcadores) {
      const distancia = Math.hypot(x - entrada.x * area.width / 100, y - entrada.y * area.height / 100);
      if (distancia <= menor) {
        menor = distancia;
        resultado = entrada;
      }
    }
    return resultado;
  }

  mapa.addEventListener("pointermove", (evento) => {
    if (evento.pointerType === "touch") return;
    destacarPonto(pontoMaisProximo(evento));
    mapa.classList.toggle("mapa-interativo", Boolean(pontoAtivo));
  });
  mapa.addEventListener("pointerleave", () => {
    destacarPonto();
    mapa.classList.remove("mapa-interativo");
  });
  mapa.addEventListener("click", (evento) => {
    if (params.get("debug") === "mapa") {
      const area = mapa.getBoundingClientRect();
      const x = ((evento.clientX - area.left) / area.width * 100 - MAPA_LIMITES.esquerda) / MAPA_LIMITES.largura * 100;
      const y = ((evento.clientY - area.top) / area.height * 100 - MAPA_LIMITES.topo) / MAPA_LIMITES.altura * 100;
      const rotulo = mapa.querySelector(".cobertura-debug");
      rotulo.textContent = "x: " + x.toFixed(2) + "% · y: " + y.toFixed(2) + "%";
      rotulo.hidden = false;
      console.info("[mapa]", rotulo.textContent);
      return;
    }
    pontoMaisProximo(evento)?.chip.click();
  });

  const whatsappCobertura = document.querySelector(".cobertura-whatsapp");
  whatsappCobertura.href = whatsappUrl("Olá, não encontrei minha comarca na lista. Preciso de orçamento para edital em [cidade].");
  whatsappCobertura.addEventListener("click", () => track("whatsapp_click", { origem: "cobertura" }));

  const faqItems = [...document.querySelectorAll(".faq__item")];
  const faqAcceptedOpens = new WeakSet(faqItems.filter((item) => item.open));
  for (const item of faqItems) {
    item.addEventListener("toggle", () => {
      if (!item.open) {
        faqAcceptedOpens.delete(item);
        return;
      }
      if (faqAcceptedOpens.has(item)) return;
      faqAcceptedOpens.add(item);
      // Fallback para navegadores sem exclusividade pelo atributo name.
      for (const other of faqItems) {
        if (other !== item && other.open) other.open = false;
      }
      track("faq_open", { pergunta: Number(item.id.slice(4)) });
    });
  }

  function openFaqFromHash() {
    if (!/^#faq-\d+$/.test(location.hash)) return;
    const item = document.getElementById(location.hash.slice(1));
    if (!faqItems.includes(item)) return;
    for (const other of faqItems) other.open = other === item;
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() => item.scrollIntoView({ behavior: reducedMotion ? "instant" : "smooth", block: "start" }));
  }

  openFaqFromHash();
  window.addEventListener("hashchange", openFaqFromHash);

  const faqWhatsApp = document.querySelector(".faq__whatsapp");
  faqWhatsApp.href = whatsappUrl("Olá, tenho uma dúvida sobre publicação de edital em jornal no Paraná.");
  faqWhatsApp.addEventListener("click", () => track("whatsapp_click", { origem: "faq" }));
}

// Em Escritórios, o título pode quebrar dentro de uma coluna mais estreita.
// O CSS mede os títulos de linhas fixas. Aqui é preciso medir a linha renderizada.
const officeTitle = document.querySelector(".escritorios-conteudo .titulo__linha");
if (officeTitle) {
  const title = officeTitle;
  const block = title.closest(".bloco-texto");
  const viewport = matchMedia("(min-width:768px) and (max-width:1099px)");
  const sheet = document.querySelector('link[href="styles.css"]').sheet;
  const rule = sheet.cssRules[sheet.insertRule(".escritorios-conteudo {}", sheet.cssRules.length)];
  let frame;
  function measureTitle() {
    frame = 0;
    rule.style.removeProperty("--medida-titulo");
    if (!viewport.matches) return;

    // Range retorna um retângulo por linha do texto, excluindo a sobra do bloco.
    const range = document.createRange();
    range.selectNodeContents(title);
    const width = Math.max(0, ...[...range.getClientRects()].map((line) => line.width));
    if (width && block.getBoundingClientRect().width - width > .5) {
      rule.style.setProperty("--medida-titulo", `${Math.ceil(width * 100) / 100}px`);
    }
  }
  function scheduleTitle() {
    if (!frame) frame = requestAnimationFrame(measureTitle);
  }

  measureTitle();
  document.fonts?.ready.then(scheduleTitle);
  window.addEventListener("resize", scheduleTitle);
}

// Alinha o banner e o contato da cobertura pelas medidas reais dos elementos.
const selosBanner = document.querySelector(".hero .trust");
const cartaoBanner = document.querySelector(".hero #formulario");
const campoLargo = document.querySelector('[data-cidade="Campo Largo"]');
const contatoCobertura = document.querySelector("#cobertura .cobertura-contato");

if (selosBanner && cartaoBanner && campoLargo && contatoCobertura) {
  const intro = selosBanner.closest(".intro");
  const etiqueta = intro.querySelector(".eyebrow");
  const titulo = intro.querySelector("h1");
  const subtitulo = intro.querySelector(".subtitle");
  const acoes = intro.querySelector(".actions");
  const botao = contatoCobertura.querySelector(".cobertura-whatsapp");
  const telaDesktop = matchMedia("(min-width:1024px)");
  let alignmentFrame = 0;
  let deslocamento = 0;
  let deslocamentoTexto = 0;
  function alinharElementos() {
    alignmentFrame = 0;
    if (!telaDesktop.matches) {
      deslocamento = 0;
      deslocamentoTexto = 0;
      intro.style.removeProperty("--alinhamento-texto");
      intro.style.removeProperty("--alinhamento-selos");
      contatoCobertura.classList.remove("contato-alinhado");
      return;
    }
    const baseCartao = cartaoBanner.getBoundingClientRect().bottom;
    const baseOriginal = selosBanner.getBoundingClientRect().bottom - deslocamento;
    const topoOriginalAcoes = acoes.getBoundingClientRect().top - deslocamento;
    const centroOriginalTexto = (titulo.getBoundingClientRect().top + subtitulo.getBoundingClientRect().bottom) / 2 - deslocamentoTexto;
    const baseEtiqueta = etiqueta.getBoundingClientRect().bottom;
    const largura = campoLargo.getBoundingClientRect().right - contatoCobertura.getBoundingClientRect().left;
    const cabe = largura >= botao.offsetWidth + 115;

    deslocamento = Math.max(0, baseCartao - baseOriginal);
    deslocamentoTexto = (baseEtiqueta + topoOriginalAcoes + deslocamento) / 2 - centroOriginalTexto;
    intro.style.setProperty("--alinhamento-selos", `${deslocamento}px`);
    intro.style.setProperty("--alinhamento-texto", `${deslocamentoTexto}px`);
    contatoCobertura.classList.toggle("contato-alinhado", cabe);
    if (cabe) contatoCobertura.style.setProperty("--largura-contato", `${largura}px`);
  }
  function agendarAlinhamento() {
    if (!alignmentFrame) alignmentFrame = requestAnimationFrame(alinharElementos);
  }
  alinharElementos();
  document.fonts?.ready.then(agendarAlinhamento);
  window.addEventListener("resize", agendarAlinhamento, { passive:true });
  if ("ResizeObserver" in window) {
    const observador = new ResizeObserver(agendarAlinhamento);
    [cartaoBanner, intro, campoLargo.closest("ul"), campoLargo].forEach(elemento => observador.observe(elemento));
  }
}

// Mantém a lista aberta nas telas largas e oferece controles nativos nas estreitas.
const coberturaCompacta = window.matchMedia("(max-width:839px)");
for (const grupo of document.querySelectorAll(".cobertura-regioes > div")) {
  const titulo = grupo.querySelector("h3");
  const cidades = grupo.querySelector("ul");
  const rotulo = document.createElement("span");
  const controle = document.createElement("button");
  rotulo.textContent = titulo.textContent;
  controle.textContent = titulo.textContent;
  controle.type = "button";
  controle.className = "regiao-controle";
  cidades.id = titulo.id + "-cidades";
  controle.setAttribute("aria-controls", cidades.id);
  titulo.replaceChildren(rotulo, controle);

  let expandido = false;
  function atualizarRegiao() {
    controle.hidden = !coberturaCompacta.matches;
    rotulo.hidden = coberturaCompacta.matches;
    cidades.hidden = coberturaCompacta.matches && !expandido;
    controle.setAttribute("aria-expanded", String(!cidades.hidden));
  }
  controle.addEventListener("click", () => {
    expandido = !expandido;
    atualizarRegiao();
  });
  coberturaCompacta.addEventListener("change", atualizarRegiao);
  atualizarRegiao();
}
