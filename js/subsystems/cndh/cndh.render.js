import { escapeHtml } from "../../core/util.js";
import { TH } from "../../model/thresholds.js";

function badgeClass(st){
  return st==="ok" ? "st-ok" : st==="warn" ? "st-warn" : st==="alarm" ? "st-alarm" : "st-inactive";
}

function stWord(st){
  return st==="ok" ? "норма" : st==="warn" ? "предупреждение" : st==="alarm" ? "авария" : "не в эксплуатации";
}

function safe(v){
  return v == null || v === "" ? "—" : String(v);
}

function num(v){
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function clsByMax(v, warnMax, alarmMax){
  const n = num(v);
  if(n == null) return "st-muted";
  if(n > alarmMax) return "st-alarm";
  if(n > warnMax) return "st-warn";
  return "st-ok";
}

function isBad(value){
  const s = String(value || "").trim().toLowerCase();
  return s === "сработал" || s === "ошибка" || s === "было" || s === "был" || s === "не готов";
}

function resultWord(cls){
  if(cls === "st-ok") return "норма";
  if(cls === "st-warn") return "предупреждение";
  if(cls === "st-alarm") return "авария";
  return "не определено";
}

function vcell(value, cls="st-muted", opts=""){
  return `<td class="egytd-val ${cls}" ${opts}>${escapeHtml(safe(value))}</td>`;
}

function lcell(text, opts=""){
  return `<td class="egytd-lbl" ${opts}>${escapeHtml(text)}</td>`;
}

function cell(label, value, cls="st-muted", hint=""){
  return `
    <div class="egy-row">
      <div class="egy-lbl">${escapeHtml(label)}</div>
      <div class="egy-val ${cls}" title="${escapeHtml(hint)}">${escapeHtml(safe(value))}</div>
    </div>
  `;
}

function checkRow(name, value, criterion, cls, reason, action){
  return `
    <tr>
      <td class="egytd-lbl">${escapeHtml(name)}</td>
      <td class="egytd-val st-muted">${escapeHtml(safe(value))}</td>
      <td class="egytd-val st-muted">${escapeHtml(criterion)}</td>
      <td class="egytd-val ${cls}">${escapeHtml(resultWord(cls))}</td>
      <td class="egytd-val st-muted">${escapeHtml(reason)}</td>
      <td class="egytd-val st-muted">${escapeHtml(action)}</td>
    </tr>
  `;
}

function rowCrit(name, cur, ok, warn, alarm){
  return `
    <tr>
      <td>${escapeHtml(name)}</td>
      <td class="mono">${escapeHtml(safe(cur))}</td>
      <td class="mono">${escapeHtml(ok)}</td>
      <td class="mono">${escapeHtml(warn)}</td>
      <td class="mono">${escapeHtml(alarm)}</td>
    </tr>
  `;
}

function egyptHeader(ctx, title){
  const { satNo, sat } = ctx;
  const sub = sat?.subsystems?.cndh;
  const st = sat?.inactive ? "inactive" : (sub?.st || "warn");

  const ageMs = Date.now() - (sat?.lastUpdateMs || 0);
  const qualityOk = (sat?.link === "ok" && ageMs <= 8000);
  const quality = qualityOk ? "достоверна" : "нет достоверной ТМИ";
  const qCls = qualityOk ? "st-ok" : "st-alarm";

  const p = sub?.params || {};
  const active = p["Активный комплект БВС"] || "—";
  const mode = p["Режим БКУ"] || "—";

  return `
    <div class="egy-top">
      <div class="egy-title mono">[КА "${escapeHtml(String(satNo))}"] БКУ/БВС: ${escapeHtml(title)}</div>

      <div class="egy-line">
        <span class="badge ${badgeClass(st)}">${escapeHtml(stWord(st))}</span>
        <span class="chip ${qCls}">ТМИ: ${escapeHtml(quality)}</span>
        <span class="chip st-muted">ВО: <span class="mono">${escapeHtml(sat?.lastUpdate || "—")}</span></span>
        <span class="chip st-muted">Активный комплект: <span class="mono">${escapeHtml(String(active))}</span></span>
        <span class="chip st-muted">Режим: <span class="mono">${escapeHtml(String(mode))}</span></span>

        <span class="egy-sep"></span>

        <button class="btn-mini" data-open-sub="cndh_current" data-open-title="БКУ/БВС: Текущее состояние">Текущее состояние</button>
        <button class="btn-mini" data-open-sub="cndh_control" data-open-title="БКУ/БВС: Контроль состояния">Контроль состояния</button>
        <button class="btn-mini" data-open-sub="cndh_config" data-open-title="БКУ/БВС: Конфигурация и резервирование">Конфигурация и резервирование</button>
      </div>
    </div>
  `;
}

export function renderDetailCNDH(ctx){
  return renderCndhCurrent(ctx);
}

export function renderDetailCNDH_Control(ctx){
  return renderCndhControl(ctx);
}

export function renderDetailCNDH_Current(ctx){
  return renderCndhCurrent(ctx);
}

export function renderDetailCNDH_Config(ctx){
  return renderCndhConfig(ctx);
}

function renderCndhCurrent(ctx){
  const { sat } = ctx;
  const sub = sat?.subsystems?.cndh;
  const p = sub?.params || {};
  const th = TH.cndh;

  const loadCls = clsByMax(p["Загрузка БВС, %"], th.CPU_WARN_PCT, th.CPU_ALARM_PCT);
  const memCls = clsByMax(p["Использование памяти БВС, %"], th.MEM_WARN_PCT, th.MEM_ALARM_PCT);
  const wdCls = isBad(p["Сторожевой контроль БКУ"]) ? "st-alarm" : "st-ok";
  const swCls = isBad(p["Контроль целостности ПО"]) ? "st-alarm" : "st-ok";
  const rebootCls = isBad(p["Перезапуск ПО"]) ? "st-warn" : "st-ok";
  const switchCls = isBad(p["Переключение на резерв"]) ? "st-warn" : "st-ok";
  const reserveCls = String(p["Резервный комплект БВС"] || "").toLowerCase() === "не готов" ? "st-warn" : "st-ok";

  return `
    <div class="egyfmt">
      ${egyptHeader(ctx, "Текущее состояние")}

      <div class="egy-sheet">
        <table class="egy-table" cellspacing="0" cellpadding="0">
          <tr>
            <td class="egytd-top" colspan="8">Текущие параметры БКУ/БВС</td>
          </tr>

          <tr>
            <td class="egytd-sec" colspan="8">Режим и конфигурация вычислительного контура</td>
          </tr>
          <tr>
            ${lcell("Режим БКУ")}
            ${vcell(p["Режим БКУ"], "st-muted")}
            ${lcell("Конфигурация БВС")}
            ${vcell(p["Конфигурация БВС"], String(p["Конфигурация БВС"]).toLowerCase()==="штатная" ? "st-ok" : "st-warn")}
            ${lcell("Активный комплект БВС")}
            ${vcell(p["Активный комплект БВС"], "st-muted")}
            ${lcell("Резервный комплект БВС")}
            ${vcell(p["Резервный комплект БВС"], reserveCls)}
          </tr>

          <tr>
            <td class="egytd-sec" colspan="8">Вычислительные ресурсы</td>
          </tr>
          <tr>
            ${lcell("Загрузка БВС, %")}
            ${vcell(p["Загрузка БВС, %"], loadCls)}
            ${lcell("Использование памяти БВС, %")}
            ${vcell(p["Использование памяти БВС, %"], memCls)}
            ${lcell("Температура БКУ, °C")}
            ${vcell(p["Температура БКУ, °C"], "st-muted", `colspan="3"`)}
          </tr>

          <tr>
            <td class="egytd-sec" colspan="8">Программно-аппаратные признаки</td>
          </tr>
          <tr>
            ${lcell("Сторожевой контроль БКУ")}
            ${vcell(p["Сторожевой контроль БКУ"], wdCls)}
            ${lcell("Контроль целостности ПО")}
            ${vcell(p["Контроль целостности ПО"], swCls)}
            ${lcell("Перезапуск ПО")}
            ${vcell(p["Перезапуск ПО"], rebootCls)}
            ${lcell("Переключение на резерв")}
            ${vcell(p["Переключение на резерв"], switchCls)}
          </tr>
        </table>

        <div class="egy-footnote">
          <span class="mono">Назначение формата:</span> отображение текущих телеметрических и логических признаков БКУ/БВС без развернутой диагностической интерпретации.
        </div>
      </div>
    </div>
  `;
}

function renderCndhControl(ctx){
  const { sat } = ctx;
  const sub = sat?.subsystems?.cndh;
  const p = sub?.params || {};
  const th = TH.cndh;

  const load = p["Загрузка БВС, %"];
  const mem = p["Использование памяти БВС, %"];

  const loadCls = clsByMax(load, th.CPU_WARN_PCT, th.CPU_ALARM_PCT);
  const memCls = clsByMax(mem, th.MEM_WARN_PCT, th.MEM_ALARM_PCT);
  const wdCls = isBad(p["Сторожевой контроль БКУ"]) ? "st-alarm" : "st-ok";
  const swCls = isBad(p["Контроль целостности ПО"]) ? "st-alarm" : "st-ok";
  const rebootCls = isBad(p["Перезапуск ПО"]) ? "st-warn" : "st-ok";
  const switchCls = isBad(p["Переключение на резерв"]) ? "st-warn" : "st-ok";
  const reserveCls = String(p["Резервный комплект БВС"] || "").toLowerCase() === "не готов" ? "st-warn" : "st-ok";

  const st = sat?.inactive ? "inactive" : (sub?.st || "warn");
  const msg = sub?.msg || "—";

  const ageMs = Date.now() - (sat?.lastUpdateMs || 0);
  const tmiOk = sat?.link === "ok" && ageMs <= 8000;
  const tmiCls = tmiOk ? "st-ok" : "st-alarm";

  const actionOverall =
    st === "ok" ? "штатный контроль" :
    st === "warn" ? "проверить устойчивость вычислительного контура и готовность резерва" :
    st === "alarm" ? "перевести КА в безопасный режим, проверить БКУ/БВС и возможность резервирования" :
    "ожидать ввода КА в эксплуатацию";

  const rows = [
    checkRow(
      "Качество ТМИ БКУ/БВС",
      tmiOk ? "достоверна" : "нет достоверной ТМИ",
      "связь с КА есть, данные актуальны",
      tmiCls,
      tmiOk ? "данные пригодны для контроля" : "данные нельзя использовать как достоверные",
      tmiOk ? "продолжить контроль" : "проверить канал ТМ/КИ"
    ),
    checkRow(
      "Загрузка БВС",
      `${safe(load)} %`,
      `норма ≤${th.CPU_WARN_PCT}%; предупреждение ${th.CPU_WARN_PCT}…${th.CPU_ALARM_PCT}%; авария >${th.CPU_ALARM_PCT}%`,
      loadCls,
      loadCls === "st-ok" ? "вычислительный ресурс достаточен" : loadCls === "st-warn" ? "повышенная загрузка вычислительного контура" : "перегрузка БВС",
      loadCls === "st-ok" ? "действий не требуется" : loadCls === "st-warn" ? "проверить режимы БКУ и нагрузку от подсистем" : "ограничить операции, требующие вычислительных ресурсов"
    ),
    checkRow(
      "Использование памяти БВС",
      `${safe(mem)} %`,
      `норма ≤${th.MEM_WARN_PCT}%; предупреждение ${th.MEM_WARN_PCT}…${th.MEM_ALARM_PCT}%; авария >${th.MEM_ALARM_PCT}%`,
      memCls,
      memCls === "st-ok" ? "запас памяти достаточен" : memCls === "st-warn" ? "повышенное использование памяти" : "недопустимое использование памяти",
      memCls === "st-ok" ? "действий не требуется" : memCls === "st-warn" ? "проверить журналы и объём буферизации" : "подготовить перезапуск/переход на резерв по регламенту"
    ),
    checkRow(
      "Сторожевой контроль БКУ",
      p["Сторожевой контроль БКУ"],
      "срабатывание = аварийный признак",
      wdCls,
      wdCls === "st-ok" ? "срыв цикла ПО не зафиксирован" : "зафиксировано зависание или нарушение цикла ПО",
      wdCls === "st-ok" ? "действий не требуется" : "проверить перезапуск ПО и переход на резерв"
    ),
    checkRow(
      "Контроль целостности ПО",
      p["Контроль целостности ПО"],
      "ошибка контроля целостности = аварийный признак",
      swCls,
      swCls === "st-ok" ? "целостность ПО подтверждена" : "ошибка контроля целостности ПО",
      swCls === "st-ok" ? "действий не требуется" : "запретить обновление режимов до анализа ПО"
    ),
    checkRow(
      "Перезапуск ПО",
      p["Перезапуск ПО"],
      "единичный перезапуск = предупреждение; повторный перезапуск требует аварийного регламента",
      rebootCls,
      rebootCls === "st-ok" ? "перезапуск не зафиксирован" : "зафиксирован перезапуск ПО",
      rebootCls === "st-ok" ? "действий не требуется" : "проанализировать журнал БКУ и смежные события"
    ),
    checkRow(
      "Переход на резерв",
      p["Переключение на резерв"],
      "факт перехода на резерв = предупреждение, при потере управления = авария",
      switchCls,
      switchCls === "st-ok" ? "активный комплект стабилен" : "зафиксирован переход на резерв",
      switchCls === "st-ok" ? "действий не требуется" : "проверить готовность резервного комплекта и устойчивость управления"
    ),
    checkRow(
      "Готовность резерва",
      p["Резервный комплект БВС"],
      "резерв должен быть готов к включению/работе",
      reserveCls,
      reserveCls === "st-ok" ? "резервный комплект готов" : "резервный комплект не готов",
      reserveCls === "st-ok" ? "действий не требуется" : "ограничить рискованные операции до восстановления резерва"
    )
  ].join("");

  return `
    <div class="egyfmt">
      ${egyptHeader(ctx, "Контроль состояния")}

      <div class="egy-sheet">
        <table class="egy-table" cellspacing="0" cellpadding="0">
          <tr>
            <td class="egytd-top" colspan="6">Итоговая оценка состояния БКУ/БВС</td>
          </tr>
          <tr>
            ${lcell("Итоговое состояние")}
            ${vcell(stWord(st), badgeClass(st))}
            ${lcell("Причина")}
            ${vcell(msg, badgeClass(st))}
            ${lcell("Действие оператора")}
            ${vcell(actionOverall, "st-muted")}
          </tr>
          <tr>
            <td class="egytd-sec" colspan="6">Результаты алгоритма контроля</td>
          </tr>
          <tr>
            <td class="egytd-sec">Контролируемый признак</td>
            <td class="egytd-sec">Значение</td>
            <td class="egytd-sec">Критерий</td>
            <td class="egytd-sec">Состояние</td>
            <td class="egytd-sec">Причина</td>
            <td class="egytd-sec">Действие</td>
          </tr>
          ${rows}
        </table>

        <div class="egy-footnote">
          <span class="mono">Назначение формата:</span> оценка работоспособности бортового управляющего контура по признакам вычислительных ресурсов, программного контроля и резервирования.
        </div>
      </div>

      <div class="egy-box">
        <div class="egy-box-h">Критерии контроля</div>
        <table class="ptable">
          <thead>
            <tr>
              <th>Показатель</th>
              <th style="width:120px">Текущее</th>
              <th>Норма</th>
              <th>Предупр.</th>
              <th>Авария</th>
            </tr>
          </thead>
          <tbody>
            ${rowCrit("Загрузка БВС, %", load, `≤ ${th.CPU_WARN_PCT}`, `${th.CPU_WARN_PCT}…${th.CPU_ALARM_PCT}`, `> ${th.CPU_ALARM_PCT}`)}
            ${rowCrit("Использование памяти БВС, %", mem, `≤ ${th.MEM_WARN_PCT}`, `${th.MEM_WARN_PCT}…${th.MEM_ALARM_PCT}`, `> ${th.MEM_ALARM_PCT}`)}
            ${rowCrit("Сторожевой контроль БКУ", p["Сторожевой контроль БКУ"], "норма", "—", "сработал")}
            ${rowCrit("Контроль целостности ПО", p["Контроль целостности ПО"], "норма", "—", "ошибка")}
            ${rowCrit("Переключение на резерв", p["Переключение на резерв"], "нет", "было", "—")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderCndhConfig(ctx){
  const { sat } = ctx;
  const sub = sat?.subsystems?.cndh;
  const p = sub?.params || {};

  const active = String(p["Активный комплект БВС"] || "—");
  const reserve = String(p["Резервный комплект БВС"] || "—");
  const switchText = String(p["Переключение на резерв"] || "нет");
  const switchCls = isBad(switchText) ? "st-warn" : "st-ok";
  const reserveCls = reserve.toLowerCase() === "не готов" ? "st-warn" : "st-ok";

  return `
    <div class="egyfmt">
      ${egyptHeader(ctx, "Конфигурация и резервирование")}

      <div class="egy-grid">
        <div class="egy-box">
          <div class="egy-box-h">Конфигурация вычислительного контура</div>
          ${cell("Активный комплект БВС", active, "st-muted")}
          ${cell("Резервный комплект БВС", reserve, reserveCls)}
          ${cell("Переключение на резерв", switchText, switchCls)}
          ${cell("Конфигурация БВС", p["Конфигурация БВС"], String(p["Конфигурация БВС"]).toLowerCase()==="штатная" ? "st-ok" : "st-warn")}
          ${cell("Режим БКУ", p["Режим БКУ"], "st-muted")}
        </div>

        <div class="egy-box">
          <div class="egy-box-h">Инженерная интерпретация</div>
          <div class="egy-note">
            <div class="egy-note-row">Основной комплект БВС выполняет управление КА, резервный комплект должен быть готов к включению или работе при отказе активного комплекта.</div>
            <div class="egy-note-row">Переход на резерв не является аварией сам по себе, но является признаком деградации и требует анализа причины переключения.</div>
            <div class="egy-note-row">Потеря готовности резерва снижает живучесть БКУ/БВС и должна отображаться как предупреждение.</div>
          </div>
        </div>

        <div class="egy-box" style="grid-column:1 / -1;">
          <div class="egy-note">
            <div class="egy-note-row"><b>Норма:</b> активный комплект работает, резерв готов, конфигурация БВС штатная.</div>
            <div class="egy-note-row"><b>Предупреждение:</b> был переход на резерв, резерв не готов или конфигурация стала нештатной при сохранении управления.</div>
            <div class="egy-note-row"><b>Авария:</b> сработал сторожевой контроль, нарушена целостность ПО или вычислительный контур перегружен до аварийного уровня.</div>
          </div>
        </div>
      </div>
    </div>
  `;
}