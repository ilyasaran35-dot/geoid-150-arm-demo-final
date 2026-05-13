import { escapeHtml, setCellStatusClass } from "../../core/util.js";
import { getSubMeta } from "../../core/registry.js";

export function renderDetailGeneric(ctx){
  const { satNo, sat, subId } = ctx;
  const meta = getSubMeta(subId);
  const sub = sat?.subsystems?.[subId];
  const st = sat?.inactive ? "inactive" : (sub?.st || "warn");
  const params = sub?.params || {};

  const badge = st==="ok" ? "st-ok" : st==="warn" ? "st-warn" : st==="alarm" ? "st-alarm" : "st-inactive";
  const stWord = st==="ok" ? "Норма" : st==="warn" ? "Предупреждение" : st==="alarm" ? "Авария" : "Не в эксплуатации";

  const rows = Object.keys(params).slice(0,140).map(k =>
    `<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(params[k])}</td><td class="${badge}">${stWord}</td></tr>`
  ).join("");

  return `
    <div class="modal-backdrop" id="modalBackdrop" style="display:block"></div>
    <div class="modal" style="display:flex" role="dialog" aria-modal="true">
      <div class="modal-head">
        <div class="modal-title">Уровень 4: КА ${escapeHtml(satNo)} • ${escapeHtml(meta.name)}</div>
        <button id="modalClose" class="modal-x" aria-label="Закрыть">×</button>
      </div>
      <div class="modal-body">
        <div class="modal-block">
          <div class="modal-h">Параметры подсистемы (временный общий формат)</div>
          <table class="ptable">
            <thead><tr><th>Параметр</th><th>Значение</th><th>Статус</th></tr></thead>
            <tbody>${rows || `<tr><td colspan="3" class="muted">Нет данных</td></tr>`}</tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}
