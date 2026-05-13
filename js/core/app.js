import { TOTAL_PLANES, SATS_PER_PLANE, TOTAL_SATS } from "../model/constell.js";
import { buildConstellationState } from "../model/satModel.js";
import { nowStamp } from "./util.js";
import {
  renderPlanesTable,
  refreshPlaneColors,
  renderEvents,
  showPlaceholder,
  highlightSelectedPlane,
  openEventsJournal
} from "./ui.js";
import { openPlane, goUp } from "./nav.js";
import { tickSimulation, injectEvent, applyIncident } from "./sim.js";
import { refreshOpenWindows } from "./modal.js";

const ui = {
  planesPanel: document.getElementById("planesPanel"),
  detailPanel: document.getElementById("detailPanel"),
  detailTitle: document.getElementById("detailTitle"),
  statusLine: document.getElementById("statusLine"),
  eventsList: document.getElementById("eventsList"),
  btnEventsJournal: document.getElementById("btnEventsJournal"),
  clockEl: document.getElementById("clock"),
  footerMeta: document.getElementById("footerMeta"),

  btnUp: document.getElementById("btnUp"),
  btnReset: document.getElementById("btnReset"),
  btnInject: document.getElementById("btnInject"),
  onlyProblems: document.getElementById("onlyProblems"),
  autoTick: document.getElementById("autoTick"),
  modalRoot: document.getElementById("subModalRoot"),
};

const state = {
  sats: buildConstellationState(),
  events: [],


  view: "home",
  selectedPlane: null,
  selectedSat: null,

  // единая точка применения локального инцидента (для окон уровня 4)
  onLocalIncident: (satNo, subId, level)=>{
    applyIncident(state.sats, state.events, satNo, subId, level, "Локальный инцидент");
    const ev = state.events[0];
    setLastIncident(ev);
    renderEvents(state.events, ui.eventsList, ui.modalRoot, state.sats);
    refreshPlaneColors(ui.planesPanel, state.sats);
  }
};

function setLastIncident(ev){
  return;
}

function updateClock(){
  ui.clockEl.textContent=nowStamp();
  setTimeout(updateClock, 1000);
}

function rerenderPlanesList(){
  renderPlanesTable(
    ui.planesPanel,
    (plane)=>openPlane(state, ui, plane),
    state.sats,
    !!ui.onlyProblems?.checked
  );
  highlightSelectedPlane(ui.planesPanel, state.selectedPlane);
}

function hardReset(){
  state.sats = buildConstellationState();
  state.events = [];
  setLastIncident(null);

  state.view="home";
  state.selectedPlane=null;
  state.selectedSat=null;

  rerenderPlanesList();
  showPlaceholder(ui.detailTitle, ui.detailPanel, ui.statusLine);
  renderEvents(state.events, ui.eventsList, ui.modalRoot, state.sats);
  ui.btnUp.disabled=true;
  ui.btnUp.textContent="← Назад";
}

ui.btnUp.addEventListener("click", ()=>goUp(state, ui));
ui.btnReset.addEventListener("click", hardReset);

ui.btnEventsJournal?.addEventListener("click", ()=>{
  openEventsJournal(state.events, ui.modalRoot, state.sats);
});

ui.eventsList?.addEventListener("click", ()=>{
  openEventsJournal(state.events, ui.modalRoot, state.sats);
});

ui.onlyProblems?.addEventListener("change", ()=>{
  rerenderPlanesList();

  if(state.view === "plane" && state.selectedPlane != null){
    openPlane(state, ui, state.selectedPlane);
  }
});

ui.btnInject.addEventListener("click", ()=>{
  injectEvent(state.sats, state.events);
  setLastIncident(state.events[0]);
  renderEvents(state.events, ui.eventsList, ui.modalRoot, state.sats);
  rerenderPlanesList();
  if(state.view==="plane" && state.selectedPlane!=null){
    // перерендер уровня 2
    openPlane(state, ui, state.selectedPlane);
  }
  if(state.view==="sat" && state.selectedSat!=null){
    // просто перерисовать мнемосхему
    const satNo = state.selectedSat;
    // перерисовка уровня 3 после изменения состояния КА
    import("./nav.js").then(({ openSat })=>openSat(state, ui, satNo));
  }
});

// init
ui.footerMeta.textContent = `P=${TOTAL_PLANES} · N=${SATS_PER_PLANE} · Всего=${TOTAL_SATS}`;
rerenderPlanesList();
showPlaceholder(ui.detailTitle, ui.detailPanel, ui.statusLine);
renderEvents(state.events, ui.eventsList, ui.modalRoot, state.sats);
updateClock();

let lastViewRenderMs = 0;
let cachedOpenSat = null;
import("./nav.js").then(m=>{ cachedOpenSat = m.openSat; });

setInterval(()=>{
  if(!ui.autoTick.checked) return;
  try{
    tickSimulation(state.sats, state.events);
    renderEvents(state.events, ui.eventsList, ui.modalRoot, state.sats);
    rerenderPlanesList();

    // Уровни 2/3 перерисовываем РЕДКО (троттлинг), чтобы:
    // 1) статусы обновлялись, 2) интерфейс не "мигал" и не терял обработчики.
    const now = Date.now();
    if(now - lastViewRenderMs > 1600){
      lastViewRenderMs = now;
      if(state.view==="plane" && state.selectedPlane!=null){
        openPlane(state, ui, state.selectedPlane);
      }else if(state.view==="sat" && state.selectedSat!=null){
        if(cachedOpenSat){
          cachedOpenSat(state, ui, state.selectedSat);
        }
      }
    }

    refreshOpenWindows(state.sats, ui.modalRoot, (satNo, subId)=>{
      return (level)=>state.onLocalIncident(satNo, subId, level);
    });
  }catch(e){
    console.error("autoTick error:", e);
  }
}, 900);
