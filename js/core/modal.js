import { getDetailRenderer } from "./registry.js";

// ===== Мультиоконный уровень 4 (вместо одного модального окна) =====
// Политика:
// - Можно открыть несколько форматов (разные подсистемы/КА)
// - Клик по уже открытому окну поднимает его наверх
// - Каждое окно имеет собственные обработчики и живёт независимо
// - Перерисовка окон допускается на тике имитации ТМИ

const windows = new Map(); // key -> { id, el }
let zTop = 2000;

const CURRENT_ROUTE_ALIASES = {
  eps_current: "eps",
  therm_current: "therm",
  cndh_current: "cndh",
  tmi_current: "tmi",
  suba_current: "suba",
  ttc_current: "ttc",
  mss_current: "mss",
  gnc_current: "gnc",
  adcs_current: "adcs",
  prop_current: "prop",
  brk_current: "brk",
  afu_current: "afu",
};

function canonicalSubId(subId){
  return CURRENT_ROUTE_ALIASES[subId] || subId;
}

function keyOf(satNo, subId){
  return `${satNo}::${canonicalSubId(subId)}`;
}

function bringToFront(el){
  zTop += 1;
  el.style.zIndex = String(zTop);
}

function clamp(v, min, max){
  return Math.max(min, Math.min(max, v));
}

function applyWindowScale(winEl){
  const body = winEl.querySelector(".win-body");
  const scaleEl = winEl.querySelector(".win-scale");
  if(!body || !scaleEl) return;

  scaleEl.style.transform = "scale(1)";
  scaleEl.style.width = "100%";

  const bodyW = Math.max(1, body.clientWidth);
  const bodyH = Math.max(1, body.clientHeight);

  const contentW = Math.max(1, scaleEl.scrollWidth);
  const contentH = Math.max(1, scaleEl.scrollHeight);

  let scale = Math.min(bodyW / contentW, bodyH / contentH, 1);

  if(!Number.isFinite(scale) || scale <= 0) scale = 1;

  scaleEl.style.transform = `scale(${scale})`;
  scaleEl.style.width = `${100 / scale}%`;
}

function observeWindowResize(winEl){
  if(typeof ResizeObserver === "undefined") return;

  const observer = new ResizeObserver(()=>{
    requestAnimationFrame(()=>applyWindowScale(winEl));
  });

  observer.observe(winEl);

  winEl._resizeObserver = observer;
}

function makeDraggable(winEl){
  const head = winEl.querySelector(".win-head");
  if(!head) return;
  let dragging=false;
  let dx=0, dy=0;

  head.addEventListener("mousedown", (e)=>{
    if(e.button!==0) return;
    dragging=true;
    bringToFront(winEl);
    const r = winEl.getBoundingClientRect();
    dx = e.clientX - r.left;
    dy = e.clientY - r.top;
    e.preventDefault();
  });

  window.addEventListener("mousemove", (e)=>{
    if(!dragging) return;
    const x = clamp(e.clientX - dx, 8, window.innerWidth - 240);
    const y = clamp(e.clientY - dy, 8, window.innerHeight - 120);
    winEl.style.left = `${x}px`;
    winEl.style.top  = `${y}px`;
  });

  window.addEventListener("mouseup", ()=>{ dragging=false; });
}

function wireWindowIncidents(winEl, ctx){
  if(typeof ctx?.onLocalIncident !== "function") return;
  winEl.querySelector("#btnLocalWarn")?.addEventListener("click", ()=>ctx.onLocalIncident("warn"));
  winEl.querySelector("#btnLocalAlarm")?.addEventListener("click", ()=>ctx.onLocalIncident("alarm"));
}

function wireTabs(winEl){
  // табы: кнопки с data-tab="id"; панели .tab-panel[data-tab="id"]
  const btns = [...winEl.querySelectorAll(".tab-btn[data-tab]")];
  const panels = [...winEl.querySelectorAll(".tab-panel[data-tab]")];
  if(!btns.length || !panels.length) return;

  function activate(tabId){
    btns.forEach(b=>b.classList.toggle("active", b.getAttribute("data-tab")===tabId));
    panels.forEach(p=>p.classList.toggle("active", p.getAttribute("data-tab")===tabId));
  }

  btns.forEach(b=>b.addEventListener("click", ()=>activate(b.getAttribute("data-tab"))));
  // по умолчанию — первый таб
  activate(btns[0].getAttribute("data-tab"));
}


function wireOpeners(winEl, ctx){
  // Кнопки/ссылки открытия дополнительных форматов (внутри Level-4)
  // Пример: <button data-open-sub="eps_u">...</button>
  const items = [...winEl.querySelectorAll("[data-open-sub]")];
  if(!items.length) return;
  items.forEach(el=>{
    el.addEventListener("click", ()=>{
      const subId = el.getAttribute("data-open-sub");
      if(!subId) return;
      const sat = ctx.sats?.get ? ctx.sats.get(ctx.satNo) : ctx.sat;
      openSubDetailWindow({
        ...ctx,
        subId,
        subTitle: el.getAttribute("data-open-title") || subId,
        sat
      });
    });
  });
}


/**
 * Открыть окно уровня 4.
 * renderer(ctx) обязан вернуть HTML КОНТЕНТА окна (без backdrop и без внешней рамки).
 */
export function openSubDetailWindow(ctx){
  const k = keyOf(ctx.satNo, ctx.subId);
  const existing = windows.get(k);
  if(existing?.el){
    bringToFront(existing.el);
    existing.el.classList.add("win-pulse");
    setTimeout(()=>existing.el.classList.remove("win-pulse"), 180);
    return;
  }

  const renderer = getDetailRenderer(ctx.subId);
  const bodyHtml = renderer(ctx);

  const id = `win_${Math.random().toString(16).slice(2)}`;
  const winEl = document.createElement("div");
  winEl.className = "win";
  winEl.id = id;
  winEl.style.left = `${clamp(40 + windows.size*26, 8, window.innerWidth-420)}px`;
  winEl.style.top  = `${clamp(70 + windows.size*22, 8, window.innerHeight-240)}px`;
  bringToFront(winEl);

  winEl.innerHTML = `
    <div class="win-head">
      <div class="win-title mono">КА ${ctx.satNo} · ${ctx.subTitle || ctx.subId}</div>
      <div class="win-actions">
        <button class="win-btn" data-act="close" title="Закрыть">×</button>
      </div>
    </div>
    <div class="win-body">
      <div class="win-scale">${bodyHtml}</div>
    </div>
  `;

  // close
  winEl.querySelector('[data-act="close"]')?.addEventListener("click", ()=>{
    windows.delete(k);
    winEl._resizeObserver?.disconnect?.();
    winEl.remove();
  });

  // focus
  winEl.addEventListener("mousedown", ()=>bringToFront(winEl));

  makeDraggable(winEl);
  observeWindowResize(winEl);

  wireTabs(winEl);
  wireOpeners(winEl, ctx);
  wireWindowIncidents(winEl, ctx);

  ctx.modalRoot.appendChild(winEl);
  windows.set(k, { id, el: winEl });

  requestAnimationFrame(()=>applyWindowScale(winEl));
}

/**
 * Обновить содержимое всех открытых окон (по кнопке/таймеру).
 * ВАЖНО: после innerHTML нужно перевесить обработчики.
 */
export function refreshOpenWindows(sats, modalRoot, onLocalIncidentFactory){
  for(const [k, w] of windows){
    const [satNoStr, subId] = k.split("::");
    const satNo = parseInt(satNoStr, 10);
    const sat = sats.get(satNo);
    if(!sat || !w?.el) continue;
    const renderer = getDetailRenderer(subId);
    const html = renderer({ satNo, sat, subId });
    const body = w.el.querySelector(".win-body");
    if(body) body.innerHTML = `<div class="win-scale">${html}</div>`;

    wireTabs(w.el);
    wireOpeners(w.el, { satNo, sat, subId, modalRoot, sats, onLocalIncidentFactory });

    const ctx = {
      satNo,
      sat,
      subId,
      modalRoot,
      onLocalIncident: typeof onLocalIncidentFactory === "function" ? onLocalIncidentFactory(satNo, subId) : null
    };
    wireWindowIncidents(w.el, ctx);
    requestAnimationFrame(()=>applyWindowScale(w.el));
  }
}
