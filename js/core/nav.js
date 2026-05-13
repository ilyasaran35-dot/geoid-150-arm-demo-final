import { renderPlaneSatellites, renderSatMnemonic, showPlaceholder, highlightSelectedPlane } from "./ui.js";
import { getSubMeta } from "./registry.js";
import { openSubDetailWindow } from "./modal.js";

export function openPlane(state, ui, plane){
  state.view="plane";
  state.selectedPlane=plane;
  state.selectedSat=null;

  highlightSelectedPlane(ui.planesPanel, state.selectedPlane);
  renderPlaneSatellites(
    ui.detailTitle,
    ui.detailPanel,
    ui.statusLine,
    plane,
    state.sats,
    (satNo)=>openSat(state, ui, satNo),
    !!ui.onlyProblems?.checked
  );

  ui.btnUp.disabled=false;
  ui.btnUp.textContent="← Назад (к плоскостям)";
}

export function openSat(state, ui, satNo){
  state.view="sat";
  state.selectedSat=satNo;

  renderSatMnemonic(ui.detailTitle, ui.detailPanel, ui.statusLine, satNo, state.sats, (satNo2, subId)=>{
    const sat = state.sats.get(satNo2);
    const subMeta = getSubMeta(subId);

    openSubDetailWindow({
      satNo: satNo2,
      sat,
      subId,
      subTitle: `${subMeta.name}: Текущее состояние`,
      modalRoot: ui.modalRoot,
      onLocalIncident: (level)=>state.onLocalIncident?.(satNo2, subId, level)
    });
  });

  ui.btnUp.disabled=false;
  ui.btnUp.textContent="← Назад (к КА)";
}

export function goUp(state, ui){
  if(state.view==="sat"){
    state.view="plane";
    state.selectedSat=null;
    renderPlaneSatellites(
      ui.detailTitle,
      ui.detailPanel,
      ui.statusLine,
      state.selectedPlane,
      state.sats,
      (satNo)=>openSat(state, ui, satNo),
      !!ui.onlyProblems?.checked
    );
    ui.btnUp.textContent="← Назад (к плоскостям)";
    return;
  }
  if(state.view==="plane"){
    state.view="home";
    state.selectedPlane=null;
    state.selectedSat=null;
    highlightSelectedPlane(ui.planesPanel, state.selectedPlane);
    showPlaceholder(ui.detailTitle, ui.detailPanel, ui.statusLine);
    ui.btnUp.disabled=true;
    ui.btnUp.textContent="← Назад";
  }
}
