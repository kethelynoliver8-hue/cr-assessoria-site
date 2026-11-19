(() => {
  "use strict";

  const CONFIG = { ativo: true };
  const root = document.documentElement;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const fine = matchMedia("(min-width:768px) and (hover:hover) and (pointer:fine)");
  const compact = matchMedia("(max-width:1023px), (pointer:coarse)");
  const ease = "cubic-bezier(.2,.7,.2,1)";
  const cleanup = [];
  const running = new Set();
  const timers = new Set();
  const jobs = new Map();
  let observer;

  function stop(error) {
    root.classList.remove("anim");
    observer?.disconnect();
    timers.forEach(clearTimeout);
    running.forEach(animation => animation.cancel());
    cleanup.reverse().forEach(undo => undo());
    if (error) console.warn("Animações desativadas.", error);
  }

  function safe(callback) {
    return (...args) => {
      if (!root.classList.contains("anim")) return;
      try { callback(...args); } catch (error) { stop(error); }
    };
  }

  function later(delay, action) {
    const id = setTimeout(safe(() => {
      timers.delete(id);
      action();
    }), delay);
    timers.add(id);
  }

  function listen(target, event, action, options) {
    const callback = safe(action);
    target.addEventListener(event, callback, options);
    cleanup.push(() => target.removeEventListener(event, callback, options));
  }

  function animate(element, frames, options, done = () => {}) {
    const animation = element.animate(frames, { duration:600, easing:ease, ...options });
    running.add(animation);
    animation.finished.then(safe(() => {
      running.delete(animation);
      done();
    })).catch(() => running.delete(animation));
    return animation;
  }

  function observe(element, ratio, callback, repeat = false) {
    if (!element) return;
    jobs.set(element, { ratio, callback, repeat });
    observer.observe(element);
  }

  const select = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  function fade(element, delay = 0, y = 16, duration = 600) {
    return animate(element, [{ opacity:0, transform:`translateY(${y}px)` }, { opacity:1, transform:"none" }],
      { delay, duration, fill:"backwards" });
  }

  /* EFEITO 1: Carimbo. A confirmação de entrega pertence ao formulário original. */
  function stamp(parent) {
    const mark = document.createElement("span");
    mark.className = "anim-carimbo";
    mark.setAttribute("aria-hidden", "true");
    mark.innerHTML = '<svg viewBox="0 0 220 92" fill="none" stroke="currentColor"><rect x="4" y="4" width="212" height="84" rx="14" stroke-width="5"/><rect x="11" y="11" width="198" height="70" rx="9" stroke-width="2"/><circle cx="43" cy="46" r="17" stroke-width="3"/><path d="m34 46 6 6 12-13" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><text x="70" y="54" fill="currentColor" stroke="none" font-weight="800" letter-spacing=".14em" font-size="22">RECEBIDO</text></svg>';
    parent.prepend(mark);
    cleanup.push(() => mark.remove());
    mark.style.transform = "rotate(-6deg)";
    mark.style.opacity = ".94";
    animate(mark, [{ opacity:0, transform:"scale(1.8) rotate(-14deg)" }, { opacity:.94, transform:"rotate(-6deg)" }],
      { duration:260, easing:"cubic-bezier(.5,0,.9,.4)" }, () => animate(mark,
        ["translate(-3px,2px)", "translate(3px,-2px)", "translate(-2px,1px)", ""].map(value => ({ transform:`${value} rotate(-6deg)` })),
        { duration:220 }));
    const check = mark.querySelector("path");
    check.setAttribute("pathLength", "1");
    check.style.strokeDasharray = "1";
    animate(check, [{ strokeDashoffset:1 }, { strokeDashoffset:0 }], { delay:260, duration:450, fill:"backwards" });
    return mark;
  }

  /* Entradas leves: animar blocos inteiros reduz a quantidade de camadas simultâneas. */
  function reveal(element) {
    fade(element, 0, 8, 330);
  }

  function cascade(group) {
    const items = group.matches("ul,.editais-grid") ? [...group.children] : [group];
    items.forEach((item, index) => fade(item, Math.min(index * 35, 105), 8, 330));
  }

  /* EFEITO 9: Responde aos estados produzidos pelo formulário, sem interceptar o envio. */
  function watchForm(form) {
    const card = form.closest(".card");
    const confirmation = card.querySelector(".form-sucesso");
    let height;
    let marked;
    let shaken = false;
    let measure;
    listen(form, "submit", () => { height = card.offsetHeight; }, true);
    const state = new MutationObserver(safe(() => {
      if (!confirmation.hidden && !marked && confirmation.querySelector("p").textContent.startsWith("Pedido enviado.")) {
        measure = card.style.minHeight;
        card.style.minHeight = `${height}px`;
        confirmation.classList.add("anim-sucesso");
        marked = stamp(confirmation);
        animate(confirmation.querySelector("p"), [{ opacity:0 }, { opacity:1 }], { delay:760, duration:300, fill:"backwards" });
      } else if (confirmation.hidden && marked) {
        marked.remove();
        marked = null;
        card.style.minHeight = measure;
        confirmation.classList.remove("anim-sucesso");
      }
      const invalid = select('[aria-invalid="true"]', form);
      if (!shaken && height && invalid.length) {
        shaken = true;
        invalid.forEach(field => animate(field, [0,-4,4,-3,3,0].map(x => ({ transform:`translateX(${x}px)` })), { duration:300 }));
      }
    }));
    state.observe(card, { subtree:true, attributes:true, attributeFilter:["hidden","aria-invalid"] });
    cleanup.push(() => {
      state.disconnect();
      if (marked) card.style.minHeight = measure;
      confirmation.classList.remove("anim-sucesso");
    });

  }

  /* EFEITO 7: fallback de altura para navegadores sem ::details-content. */
  function faqFallback() {
    if (CSS.supports("interpolate-size", "allow-keywords") && CSS.supports("selector(::details-content)")) return;
    const items = select(".faq__item");
    let busy = false;
    items.forEach(item => listen(item.querySelector("summary"), "click", event => {
      event.preventDefault();
      if (busy) return;
      busy = true;
      const close = items.find(candidate => candidate.open);
      const open = item !== close;
      const slide = (details, entering, done) => {
        const answer = details.querySelector(".faq__resposta");
        const height = answer.offsetHeight;
        animate(answer, [
          { height:entering ? "0px" : `${height}px`, opacity:entering ? 0 : 1, overflow:"hidden" },
          { height:entering ? `${height}px` : "0px", opacity:entering ? 1 : 0, overflow:"hidden" }
        ], { duration:280 }, done);
      };
      const next = () => {
        if (!open) { busy = false; return; }
        item.open = true;
        slide(item, true, () => { busy = false; });
      };
      if (close) slide(close, false, () => { close.open = false; next(); });
      else next();
    }));
  }

  /* EFEITO 11: progresso de rolagem do cabeçalho. */
  function scrollEffects(header) {
    let frame = 0;
    function schedule() {
      if (frame) return;
      frame = requestAnimationFrame(safe(() => {
        frame = 0;
        const y = window.scrollY;
        const maximum = root.scrollHeight - innerHeight;
        header.classList.toggle("cabecalho--rolado", y > 24);
        header.style.setProperty("--p", Math.max(0, Math.min(1, maximum > 0 ? y / maximum : 0)));
      }));
    }
    listen(window, "scroll", schedule, { passive:true });
    listen(window, "resize", schedule);
    listen(document, "visibilitychange", () => {
      root.classList.toggle("anim-aba-oculta", document.hidden);
      schedule();
    });
    schedule();
  }

  /* EFEITOS 8 e 10: brilho, magnetismo, convite e holofote. */
  function controls() {
    select(".primary").forEach((button, index) => {
      button.style.setProperty("--i", index);
      observe(button, .01, (_, visible) => button.classList.toggle("em-vista", visible), true);
    });
    const magnetic = select("[data-magnetico]");
    const halo = select("[data-holofote]");
    let frame = 0;
    let pointer;
    listen(document, "pointermove", event => {
      if (!fine.matches || event.pointerType !== "mouse") return;
      pointer = event;
      if (frame) return;
      frame = requestAnimationFrame(safe(() => {
        frame = 0;
        const { clientX:x, clientY:y, target } = pointer;
        halo.forEach(card => {
          if (!card.contains(target)) return;
          const bounds = card.getBoundingClientRect();
          card.style.setProperty("--hx", `${x - bounds.left}px`);
          card.style.setProperty("--hy", `${y - bounds.top}px`);
        });
        if (innerWidth < 1024) return;
        magnetic.forEach(button => {
          const bounds = button.getBoundingClientRect();
          const dx = x - bounds.left - bounds.width / 2;
          const dy = y - bounds.top - bounds.height / 2;
          const distance = Math.hypot(dx, dy);
          const amount = distance > 0 && distance < 80 ? Math.min(6, distance * .12) / distance : 0;
          button.style.setProperty("--mx", `${dx * amount}px`);
          button.style.setProperty("--my", `${dy * amount}px`);
        });
      }));
    }, { passive:true });
    listen(document.documentElement, "pointerleave", () => magnetic.forEach(button => {
      button.style.removeProperty("--mx");
      button.style.removeProperty("--my");
    }));
    const floating = document.querySelector(".whatsapp-flutuante");
    const pill = floating.querySelector(".whatsapp-pilula");
    const footer = document.querySelector("#rodape");
    let interacted = false;
    listen(floating, "click", () => { interacted = true; pill.hidden = true; });
    select(".form-orcamento").forEach(form => listen(form, "submit", () => { interacted = true; pill.hidden = true; }));
    later(10000, () => {
      const bounds = footer.getBoundingClientRect();
      if (interacted || document.hidden || floating.classList.contains("oculto-na-chamada")
          || (bounds.top < innerHeight && bounds.bottom > 0)) return;
      try {
        if (sessionStorage.getItem("cr-convite")) return;
        sessionStorage.setItem("cr-convite", "1");
      } catch { /* A visita ainda pode ver o convite uma vez. */ }
      pill.hidden = false;
      cleanup.push(() => { pill.hidden = true; });
      animate(pill, [{ opacity:0, transform:"translateX(8px)" }, { opacity:1, transform:"none" }], { duration:350 });
      later(5350, () => animate(pill, [{ opacity:1 }, { opacity:0 }], { duration:350 }, () => { pill.hidden = true; }));
    });
  }

  try {
    if (!CONFIG.ativo || root.dataset.animacoes === "off" || new URLSearchParams(location.search).get("anim") === "off") {
      root.classList.add("anim-inativa");
      return;
    }
    // Toque e telas compactas usam a página estática, sem efeitos de rolagem.
    if (compact.matches || reduced.matches || !("IntersectionObserver" in window) || !Element.prototype.animate) return;
    root.classList.add("anim");
    observer = new IntersectionObserver(safe(entries => {
      for (const entry of entries) {
        const job = jobs.get(entry.target);
        if (!job) continue;
        const visible = entry.isIntersecting && entry.intersectionRatio >= job.ratio;
        if (job.repeat) job.callback(entry.target, visible);
        else if (visible) {
          observer.unobserve(entry.target);
          jobs.delete(entry.target);
          job.callback(entry.target);
        }
      }
    }), { threshold:[0,.01,.15,.3,.35,.4], rootMargin:"0px 0px -8% 0px" });
    select("[data-anim]").forEach(element => {
      const mode = element.dataset.anim;
      const target = mode === "linha-do-tempo" ? element.querySelector(".processo-layout") : element;
      observe(target, .15, mode === "cascata" ? cascade : reveal);
    });
    listen(reduced, "change", event => { if (event.matches) stop(); });
    listen(compact, "change", event => { if (event.matches) stop(); });
    select(".form-orcamento").forEach(watchForm);
    faqFallback();
    controls();
    scrollEffects(document.querySelector(".topbar"));
  } catch (error) {
    stop(error);
  }
})();
