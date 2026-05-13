import { TOTAL_PLANES, SATS_PER_PLANE, TOTAL_SATS, planeLabel, satLabel, satRangeForPlane } from "../model/constell.js";
import { setCellStatusClass, worst, escapeHtml, nowStamp } from "./util.js";
import { SUBSYSTEMS } from "./registry.js";

export function showPlaceholder(detailTitle, detailPanel, statusLine){
  detailTitle.textContent="Уровень 1: выберите плоскость слева";
  detailPanel.innerHTML=`
    <div class="placeholder">
      <div class="ph">
        <div>1) Нажмите на <b>«N-я пл-ть»</b>.</div>
        <div>2) Выберите <b>КА</b> (уровень 2).</div>
        <div>3) Откроется <b>мнемосхема систем</b> (уровень 3).</div>
        <div>4) Клик по системе откроет <b>параметры</b> (уровень 4).</div>
      </div>
    </div>`;
  statusLine.textContent="Ожидание выбора плоскости";
}

const EVENTS_JOURNAL_ID = "eventsJournalWin";
let eventsJournalFilter = "active";

function eventLevelOf(e){
  return e.level || e.st || "ok";
}

function isRecoveryEvent(e){
  const txt = String(e.text || "").toLowerCase();
  return eventLevelOf(e) === "ok" || txt.includes("восстановление");
}

function isOperationalEvent(e){
  const lvl = eventLevelOf(e);
  if(lvl !== "alarm" && lvl !== "warn") return false;
  if(isRecoveryEvent(e)) return false;
  return true;
}

function eventCls(e){
  const lvl = eventLevelOf(e);
  return lvl === "alarm" ? "st-alarm" : lvl === "warn" ? "st-warn" : "st-ok";
}

function eventLabel(e){
  const lvl = eventLevelOf(e);
  return lvl === "alarm" ? "Авария" : lvl === "warn" ? "Предупреждение" : "Восстановление";
}

function buildOperationalEvents(events){
  const seen = new Set();
  return events.filter(isOperationalEvent).filter(e=>{
    const key = `${e.sat ?? "-"}|${e.sub ?? "-"}|${e.text ?? "-"}`;
    if(seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 6);
}

function buildEventStats(events){
  const recent = events.slice(0, 120);
  const alarms = recent.filter(e=>eventLevelOf(e) === "alarm" && !isRecoveryEvent(e)).length;
  const warns = recent.filter(e=>eventLevelOf(e) === "warn" && !isRecoveryEvent(e)).length;
  const noData = recent.filter(e=>{
    const txt = String(e.text || "").toLowerCase();
    return txt.includes("нет данных") || txt.includes("потеря тми") || txt.includes("нет тми");
  }).length;
  const recoveries = recent.filter(isRecoveryEvent).length;
  return { alarms, warns, noData, recoveries };
}

function activeStatusWord(st){
  if(st === "alarm") return "Авария";
  if(st === "warn") return "Предупреждение";
  if(st === "inactive") return "Не в эксплуатации";
  return "Норма";
}

function activeIncidentSort(a, b){
  const rank = (x)=>x.level === "alarm" ? 3 : x.level === "warn" ? 2 : 1;
  if(rank(b) !== rank(a)) return rank(b) - rank(a);
  if((a.plane ?? 0) !== (b.plane ?? 0)) return (a.plane ?? 0) - (b.plane ?? 0);
  return (a.sat ?? 0) - (b.sat ?? 0);
}

function buildActiveIncidents(sats){
  const out = [];
  if(!sats) return out;

  for(const [satNo, s] of sats.entries()){
    if(!s || s.inactive) continue;

    const overall = satOverallStatus(sats, satNo);
    if(overall.level === "alarm" && overall.label === "Нет ТМИ"){
      out.push({
        ts: s.lastUpdate || nowStamp(),
        sat: satNo,
        plane: s.plane,
        sub: "ССКУ",
        level: "alarm",
        text: "Нет ТМИ / нет достоверных данных"
      });
      continue;
    }

    for(const sub of SUBSYSTEMS){
      const cur = s.subsystems?.[sub.id];
      if(!cur) continue;

      const st = cur.st || "ok";
      if(st === "ok" || st === "inactive") continue;

      out.push({
        ts: s.lastUpdate || nowStamp(),
        sat: satNo,
        plane: s.plane,
        sub: sub.name,
        level: st,
        text: cur.msg || activeStatusWord(st)
      });
    }
  }

  out.sort(activeIncidentSort);
  return out;
}

function buildActiveStats(sats){
  const items = buildActiveIncidents(sats);
  const alarms = items.filter(x=>x.level === "alarm").length;
  const warns = items.filter(x=>x.level === "warn").length;
  const noData = items.filter(x=>{
    const txt = String(x.text || "").toLowerCase();
    return txt.includes("нет тми") || txt.includes("нет данных");
  }).length;
  return { alarms, warns, noData, recoveries: 0, items };
}


function eventRowHtml(e, compact=false){
  const cls = eventCls(e);
  const sat = e.sat != null ? `КА ${e.sat}` : "—";
  const plane = e.plane != null ? `Пл.${e.plane}` : "—";
  const sub = e.sub ? `${e.sub}` : "—";
  const text = e.text || "—";
  const ts = e.ts || nowStamp();

  if(compact){
    return `
      <div class="evt evt-compact ${cls}">
        <div class="evt-top">
          <span class="mono evt-time">${escapeHtml(ts)}</span>
          <span class="evt-level ${cls}">${escapeHtml(eventLabel(e))}</span>
        </div>
        <div class="evt-main">
          <b>${escapeHtml(sat)}</b> · ${escapeHtml(sub)}
        </div>
        <div class="evt-text">${escapeHtml(text)}</div>
      </div>
    `;
  }

  return `
    <div class="evt evt-full">
      <div class="evt-col evt-col-time mono">${escapeHtml(ts)}</div>
      <div class="evt-col evt-col-level"><span class="evt-level ${cls}">${escapeHtml(eventLabel(e))}</span></div>
      <div class="evt-col evt-col-plane">${escapeHtml(plane)}</div>
      <div class="evt-col evt-col-sat">${escapeHtml(sat)}</div>
      <div class="evt-col evt-col-sub">${escapeHtml(sub)}</div>
      <div class="evt-col evt-col-text">${escapeHtml(text)}</div>
    </div>
  `;
}

function filterJournalEvents(events, sats){
  if(eventsJournalFilter === "all") return events;
  if(eventsJournalFilter === "active") return buildActiveIncidents(sats);
  if(eventsJournalFilter === "alarm") return events.filter(e=>eventLevelOf(e) === "alarm" && !isRecoveryEvent(e));
  if(eventsJournalFilter === "warn") return events.filter(e=>eventLevelOf(e) === "warn" && !isRecoveryEvent(e));
  if(eventsJournalFilter === "recovery") return events.filter(isRecoveryEvent);
  return events;
}

function bringJournalToFront(winEl){
  const current = parseInt(winEl.style.zIndex || "2200", 10);
  const next = Number.isFinite(current) ? current + 1 : 2200;
  winEl.style.zIndex = String(next);
}

function makeJournalDraggable(winEl){
  const head = winEl.querySelector(".win-head");
  if(!head) return;

  let dragging = false;
  let dx = 0;
  let dy = 0;

  head.addEventListener("mousedown", (e)=>{
    if(e.button !== 0) return;
    dragging = true;
    bringJournalToFront(winEl);

    const r = winEl.getBoundingClientRect();
    dx = e.clientX - r.left;
    dy = e.clientY - r.top;
    e.preventDefault();
  });

  window.addEventListener("mousemove", (e)=>{
    if(!dragging) return;

    const x = Math.max(8, Math.min(e.clientX - dx, window.innerWidth - 260));
    const y = Math.max(8, Math.min(e.clientY - dy, window.innerHeight - 140));

    winEl.style.left = `${x}px`;
    winEl.style.top = `${y}px`;
  });

  window.addEventListener("mouseup", ()=>{
    dragging = false;
  });
}

function renderEventsJournalContent(winEl, events, sats){
  const list = winEl.querySelector(".events-journal-list");
  const statsBox = winEl.querySelector(".events-journal-stats");
  const filters = winEl.querySelectorAll("[data-ev-filter]");

  const filtered = filterJournalEvents(events, sats).slice(0, 250);
  const stats = sats ? buildActiveStats(sats) : buildEventStats(events);

  if(statsBox){
    statsBox.innerHTML = `
      <span class="evt-chip st-alarm">Аварии: ${stats.alarms}</span>
      <span class="evt-chip st-warn">Предупр.: ${stats.warns}</span>
      <span class="evt-chip st-muted">Нет ТМИ: ${stats.noData}</span>
      <span class="evt-chip st-ok">Восстановления: ${stats.recoveries}</span>
    `;
  }

  filters.forEach(btn=>{
    btn.classList.toggle("active", btn.getAttribute("data-ev-filter") === eventsJournalFilter);
  });

  if(list){
    list.innerHTML = `
      <div class="evt-head-row">
        <div>Время</div>
        <div>Уровень</div>
        <div>Плоскость</div>
        <div>КА</div>
        <div>Подсистема</div>
        <div>Событие</div>
      </div>
      ${filtered.length
        ? filtered.map(e=>eventRowHtml(e, false)).join("")
        : `<div class="events-empty">Нет событий по текущему фильтру.</div>`}
    `;
  }
}

export function openEventsJournal(events, modalRoot, sats){
  if(!modalRoot) return;

  let winEl = document.getElementById(EVENTS_JOURNAL_ID);
  if(winEl){
    bringJournalToFront(winEl);
    renderEventsJournalContent(winEl, events, sats);
    return;
  }

  winEl = document.createElement("div");
  winEl.className = "win events-journal-win";
  winEl.id = EVENTS_JOURNAL_ID;
  winEl.style.left = "160px";
  winEl.style.top = "90px";
  winEl.style.width = "980px";
  winEl.style.height = "640px";
  winEl.style.zIndex = "2200";

  winEl.innerHTML = `
    <div class="win-head">
      <div class="win-title mono">Журнал событий АРМ НКУ</div>
      <div class="win-actions">
        <button class="win-btn" data-act="close" title="Закрыть">×</button>
      </div>
    </div>
    <div class="win-body">
      <div class="events-journal">
        <div class="events-journal-top">
          <div class="events-journal-stats"></div>
          <div class="events-journal-filters">
            <button class="btn btn-evt-filter" data-ev-filter="all" type="button">Все</button>
            <button class="btn btn-evt-filter" data-ev-filter="active" type="button">Активные</button>
            <button class="btn btn-evt-filter" data-ev-filter="alarm" type="button">Аварии</button>
            <button class="btn btn-evt-filter" data-ev-filter="warn" type="button">Предупреждения</button>
            <button class="btn btn-evt-filter" data-ev-filter="recovery" type="button">Восстановления</button>
          </div>
        </div>
        <div class="events-journal-list"></div>
      </div>
    </div>
  `;

  winEl.querySelector('[data-act="close"]')?.addEventListener("click", ()=>{
    winEl.remove();
  });

  winEl.addEventListener("mousedown", ()=>bringJournalToFront(winEl));

  winEl.querySelectorAll("[data-ev-filter]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      eventsJournalFilter = btn.getAttribute("data-ev-filter") || "all";
      renderEventsJournalContent(winEl, events, sats);
    });
  });

  modalRoot.appendChild(winEl);
  makeJournalDraggable(winEl);
  renderEventsJournalContent(winEl, events, sats);
}

export function renderEvents(events, eventsList, modalRoot, sats){
  const active = sats ? buildActiveStats(sats) : null;
  const stats = active || buildEventStats(events);
  const items = active ? active.items.slice(0, 6) : buildOperationalEvents(events);

  eventsList.innerHTML = `
    <div class="events-summary">
      <span class="evt-chip st-alarm">Аварии: ${stats.alarms}</span>
      <span class="evt-chip st-warn">Предупр.: ${stats.warns}</span>
      <span class="evt-chip st-muted">Нет ТМИ: ${stats.noData}</span>
    </div>

    <div class="events-oper">
      ${items.length
        ? items.map(e=>eventRowHtml(e, true)).join("")
        : `<div class="events-empty">Нет активных аварий и предупреждений.</div>`}
    </div>

    <div class="events-more">Нажмите на список или кнопку «Журнал», чтобы открыть полный журнал событий.</div>
  `;

  const openHandler = ()=>{
    openEventsJournal(events, modalRoot || document.getElementById("subModalRoot"), sats);
  };

  eventsList.onclick = openHandler;

  const opened = document.getElementById(EVENTS_JOURNAL_ID);
  if(opened){
    renderEventsJournalContent(opened, events, sats);
  }
}

export function satOverallStatus(sats, satNo){
  const s=sats.get(satNo);
  if(!s) return { level:"alarm", label:"Нет данных" };
  if(s.inactive) return { level:"inactive", label:"Не в эксплуатации" };

  const ageMs=Date.now()-s.lastUpdateMs;
  const noData=(s.link!=="ok") || (ageMs>8000);
  if(noData) return { level:"alarm", label:"Нет ТМИ" };

  let st="ok";
  for(const sub of SUBSYSTEMS){
    const subSt = s.subsystems?.[sub.id]?.st || "ok";
    if(subSt==="inactive") continue;
    st = worst(st, subSt);
  }
  return { level: st, label: st==="ok"?"Норма":st==="warn"?"Предупреждение":"Авария" };
}

export function planeWorstStatus(sats, plane){
  const r = satRangeForPlane(plane);
  let nAlarm = 0, nWarn = 0;

  for(let satNo = r.start; satNo <= r.end; satNo++){
    const ov = satOverallStatus(sats, satNo).level;
    if(ov === "inactive") continue;
    if(ov === "alarm") nAlarm++;
    else if(ov === "warn") nWarn++;
  }

  if(nAlarm >= 1) return "alarm";
  if(nWarn >= 1) return "warn";
  return "ok";
}


export function countPlaneIssues(sats, plane){
  const r=satRangeForPlane(plane);
  let n=0;
  for(let satNo=r.start; satNo<=r.end; satNo++){
    const ov=satOverallStatus(sats, satNo).level;
    if(ov==="warn"||ov==="alarm") n++;
  }
  return n;
}

export function renderPlanesTable(planesPanel, onPlaneClick, sats, onlyProblems=false){
  const planeList = [];
  for(let plane = 1; plane <= TOTAL_PLANES; plane++){
    if(!onlyProblems || countPlaneIssues(sats, plane) > 0){
      planeList.push(plane);
    }
  }

  if(!planeList.length){
    planesPanel.innerHTML = `
      <div class="placeholder">
        <div class="ph">Сейчас проблемные плоскости отсутствуют.</div>
      </div>
    `;
    return;
  }

  const cols = 2;
  const rows = Math.ceil(planeList.length / cols);

  let html=`<table class="grid"><tbody>`;
  for(let r=0; r<rows; r++){
    html+=`<tr>`;
    for(let c=0; c<cols; c++){
      const idx = r * cols + c;
      const plane = planeList[idx];
      if(plane == null){
        html+=`<td class="alt st-muted"></td>`;
        continue;
      }
      html+=`<td class="clickable alt" data-plane="${plane}">${planeLabel(plane)}</td>`;
    }
    html+=`</tr>`;
  }
  html+=`</tbody></table>`;
  planesPanel.innerHTML=html;

  planesPanel.querySelectorAll("[data-plane]").forEach(td=>{
    td.addEventListener("click", ()=>onPlaneClick(parseInt(td.getAttribute("data-plane"),10)));
  });

  refreshPlaneColors(planesPanel, sats);
}

export function refreshPlaneColors(planesPanel, sats){
  planesPanel.querySelectorAll("[data-plane]").forEach(td=>{
    const plane=parseInt(td.getAttribute("data-plane"),10);
    const st=planeWorstStatus(sats, plane);
    setCellStatusClass(td, st);
    const n=countPlaneIssues(sats, plane);
    td.textContent=`${planeLabel(plane)}${n?` (${n})`:""}`;
  });
}

export function highlightSelectedPlane(planesPanel, selectedPlane){
  planesPanel.querySelectorAll("[data-plane]").forEach(td=>{
    const plane=parseInt(td.getAttribute("data-plane"),10);
    td.classList.toggle("selected", selectedPlane===plane);
  });
}

export function renderPlaneSatellites(detailTitle, detailPanel, statusLine, plane, sats, onSatClick, onlyProblems=false){
  const r = satRangeForPlane(plane);
  detailTitle.textContent = `Уровень 2: плоскость ${plane} • КА`;

  const stateCls = (st)=>{
    if(st === "ok") return "st-ok";
    if(st === "warn") return "st-warn";
    if(st === "alarm") return "st-alarm";
    return "st-inactive";
  };

  const satList = [];
  for(let satNo = r.start; satNo <= r.end; satNo++){
    const ov = satOverallStatus(sats, satNo).level;
    if(!onlyProblems || ov === "warn" || ov === "alarm"){
      satList.push(satNo);
    }
  }

  if(!satList.length){
    detailPanel.innerHTML = `
      <div class="placeholder">
        <div class="ph">В плоскости ${plane} сейчас нет проблемных КА.</div>
      </div>
    `;
    statusLine.textContent = `Плоскость ${plane}: проблемные КА отсутствуют`;
    return;
  }

  const cols = 4;
  const rows = Math.ceil(satList.length / cols);

  let html = `<table class="grid level2-grid"><tbody>`;
  for(let rr = 0; rr < rows; rr++){
    html += `<tr>`;
    for(let cc = 0; cc < cols; cc++){
      const idx = rr * cols + cc;
      const satNo = satList[idx];

      if(satNo == null){
        html += `<td class="alt st-muted"></td>`;
        continue;
      }

      const sat = sats.get(satNo);
      const ov = satOverallStatus(sats, satNo);
      const role = sat?.role === "node" ? "Узловой" : "Обычный";
      const mss = sat?.subsystems?.mss;
      const fwdSt = mss?._detail?.forward?.st || mss?.st || "warn";
      const backSt = mss?._detail?.backward?.st || mss?.st || "warn";

      html += `
        <td class="clickable l2-cell" data-sat="${satNo}">
          <div class="l2-card">
            <div class="l2-card-top">
              <span class="mono l2-sat">${escapeHtml(satLabel(satNo))}</span>
              <span class="l2-role ${sat?.role === "node" ? "is-node" : "is-normal"}">${escapeHtml(role)}</span>
            </div>

            <div class="l2-card-mid">${escapeHtml(ov.label)}</div>

            <div class="l2-card-bot">
              <span class="l2-mini ${stateCls(fwdSt)}">МСС→</span>
              <span class="l2-mini ${stateCls(backSt)}">←МСС</span>
            </div>
          </div>
        </td>
      `;
    }
    html += `</tr>`;
  }
  html += `</tbody></table>`;
  detailPanel.innerHTML = html;

  detailPanel.querySelectorAll("[data-sat]").forEach(td=>{
    const satNo = parseInt(td.getAttribute("data-sat"), 10);
    const ov = satOverallStatus(sats, satNo).level;
    setCellStatusClass(td, ov === "inactive" ? "inactive" : ov);
    td.addEventListener("click", ()=>onSatClick(satNo));
  });

  statusLine.textContent = `Плоскость ${plane}: выберите КА для открытия уровня 3 (системы)`;
}

// ===== level 3 mnemonic =====
const ORBIT_PERIOD_MS=6000*1000;
const SAT_BLOCKS=[
  { id:"gnc",  label:"СУДН (навигация)", group:"service" },
  { id:"adcs", label:"СУДН (ориентация)", group:"service" },
  { id:"cndh", label:"БКУ/БВС", group:"service" },
  { id:"tmi",  label:"ТМИ/СБИ", group:"service" },
  { id:"suba", label:"СУБА", group:"service" },
  { id:"eps",  label:"СЭС", group:"service" },
  { id:"therm",label:"СОТР", group:"service" },
  { id:"prop", label:"ДУ", group:"service" },
  { id:"ttc",  label:"ССКУ", group:"service" },
  { id:"mss",  label:"МСС", group:"service" },
  { id:"brk",  label:"БРК Ku/Ka", group:"payload" },
  { id:"afu",  label:"АФУ ПН", group:"payload" },
];


export function renderSatMnemonic(detailTitle, detailPanel, statusLine, satNo, sats, onSystemClick){
  const sat = sats.get(satNo);
  if(!sat){
    detailTitle.textContent = "КА не найден";
    detailPanel.innerHTML = `<div class="placeholder"><div class="ph">Нет данных по КА.</div></div>`;
    return;
  }

  detailTitle.textContent = `Уровень 3: КА ${satNo} • состояние систем`;

  const orbitNo = getOrbitNo(sat);
  const shadow = getShadowFlag(sat);

  const stateWord = (st)=>{
    if(st === "ok") return "Норма";
    if(st === "warn") return "Предупреждение";
    if(st === "alarm") return "Авария";
    if(st === "inactive") return "Не в эксплуатации";
    return "Не определено";
  };

  const stateCls = (st)=>{
    if(st === "ok") return "st-ok";
    if(st === "warn") return "st-warn";
    if(st === "alarm") return "st-alarm";
    if(st === "inactive") return "st-inactive";
    return "st-warn";
  };

  const overall = satOverallStatus(sats, satNo);
  const role = sat?.role === "node" ? "Узловой" : "Обычный";

  const mss = sat?.subsystems?.mss;
  const mssForward = mss?._detail?.forward?.st || mss?.st || "warn";
  const mssBackward = mss?._detail?.backward?.st || mss?.st || "warn";

  const blocks = SAT_BLOCKS.map(b=>{
    const { st, msg } = blockState(sat, b.id);
    const cls = stateCls(st);
    return { ...b, st, msg, cls, stText: stateWord(st) };
  });

  const service = blocks.filter(x=>x.group==="service");
  const payload = blocks.filter(x=>x.group==="payload");

  detailPanel.innerHTML = `
    <div class="sat3-wrap">
      <div class="sat3-header">
        <div class="left">
          <div class="mono" style="font-weight:900">[КА "${escapeHtml(String(satNo))}"] Общий КА: Состояние систем</div>
          <div class="field">
            <div class="lbl">Плоскость</div>
            <div class="val mono">${escapeHtml(String(sat.plane))}</div>
          </div>
          <div class="field">
            <div class="lbl">Номер витка</div>
            <div class="val mono">${escapeHtml(String(orbitNo))}</div>
          </div>
          <div class="field">
            <div class="lbl">Роль КА</div>
            <div class="val mono">${escapeHtml(role)}</div>
          </div>
        </div>

        <div class="sat3-head-right">
          <div class="field">
            <div class="lbl">Тень</div>
            <div class="val shadow-ind ${shadow ? "shadow-on" : ""}">${shadow ? "ТЕНЬ" : "ДЕНЬ"}</div>
          </div>
        </div>
      </div>

      <div class="sat3-strip">
        <span class="sat3-badge ${stateCls(overall.level)}">КА: ${escapeHtml(overall.label)}</span>
        <span class="sat3-badge ${stateCls(mssForward)}">МСС→: ${escapeHtml(stateWord(mssForward))}</span>
        <span class="sat3-badge ${stateCls(mssBackward)}">←МСС: ${escapeHtml(stateWord(mssBackward))}</span>
        <span class="sat3-badge st-muted">ВО: ${escapeHtml(sat.lastUpdate || "—")}</span>
      </div>

      <div class="sat3-body">
        <div class="sat3-zone">
          <div class="ztitle">Служебные системы</div>
          <div class="sat3-grid">
            ${service.map(x=>`
              <div class="sysbox ${x.cls}" data-sub="${x.id}">
                <div class="sysbox-top">
                  <div class="name">${escapeHtml(x.label)}</div>
                  <div class="sysbox-st ${x.cls}">${escapeHtml(x.stText)}</div>
                </div>
                <div class="msg">${escapeHtml(x.msg)}</div>
              </div>
            `).join("")}
          </div>
        </div>

        <div class="sat3-zone">
          <div class="ztitle">Целевая нагрузка</div>
          <div class="sat3-payload">
            ${payload.map(x=>`
              <div class="sysbox ${x.cls}" data-sub="${x.id}">
                <div class="sysbox-top">
                  <div class="name">${escapeHtml(x.label)}</div>
                  <div class="sysbox-st ${x.cls}">${escapeHtml(x.stText)}</div>
                </div>
                <div class="msg">${escapeHtml(x.msg)}</div>
              </div>
            `).join("")}
          </div>
        </div>
      </div>


    </div>
  `;


  document.querySelectorAll(".sysbox[data-sub]").forEach(el=>{
    const blockId = el.getAttribute("data-sub");
    el.addEventListener("click", ()=>onSystemClick(satNo, mapBlockToSubsystemId(blockId)));
  });

  statusLine.textContent = `КА ${satNo}: уровень 3 · ${role} · ${shadow ? "ТЕНЬ" : "ДЕНЬ"} · последнее обновление ${sat.lastUpdate}`;
}



function getShadowFlag(sat){
  const p=sat?.subsystems?.eps?.params;
  const v=p?.["Режим освещённости"]||p?.["Режим освещенности"];
  return String(v||"").toUpperCase().includes("ЗАТМ");
}
function getOrbitNo(sat){
  if(sat._orbitNo0==null){ sat._orbitNo0=1000+sat.sat; sat._t0=Date.now(); }
  const k=Math.floor((Date.now()-sat._t0)/ORBIT_PERIOD_MS);
  return sat._orbitNo0+Math.max(0,k);
}
function normSt(st){ return (st==="ok"||st==="warn"||st==="alarm")?st:"warn"; }

function blockState(sat, blockId){
  if(sat.inactive) return { st:"inactive", msg:"Не в эксплуатации" };
  const ageMs=Date.now()-sat.lastUpdateMs;
  const noData=(sat.link!=="ok")||(ageMs>8000);
  if(noData) return { st:"alarm", msg:"Нет ТМИ" };

  const sub=sat.subsystems[blockId];
  if(!sub) return { st:"warn", msg:"Не определено" };
  return { st: normSt(sub.st), msg: sub.msg || "—" };
}

function mapBlockToSubsystemId(blockId){
  return blockId;
}


