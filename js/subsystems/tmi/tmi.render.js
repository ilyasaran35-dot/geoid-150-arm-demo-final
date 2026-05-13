import { escapeHtml } from "../../core/util.js";
import { TH } from "../../model/thresholds.js";

function badgeClass(st){
  return st === "ok" ? "st-ok" : st === "warn" ? "st-warn" : st === "alarm" ? "st-alarm" : "st-inactive";
}

function stWord(st){
  return st === "ok" ? "норма" : st === "warn" ? "предупреждение" : st === "alarm" ? "авария" : "не в эксплуатации";
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

function clsByMin(v, alarmMin, warnMin){
  const n = num(v);
  if(n == null) return "st-muted";
  if(n < alarmMin) return "st-alarm";
  if(n < warnMin) return "st-warn";
  return "st-ok";
}

function isBad(value){
  const s = String(value || "").trim().toLowerCase();
  return s === "нет" || s === "ошибка" || s === "нарушена" || s === "непригодна" || s === "переполнение";
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

function classes(ctx){
  const p = ctx.sat?.subsystems?.tmi?.params || {};
  const th = TH.tmi;
  const ageMs = Date.now() - (ctx.sat?.lastUpdateMs || 0);

  return {
    age: ageMs > th.AGE_ALARM_MS ? "st-alarm" : ageMs > th.AGE_WARN_MS ? "st-warn" : "st-ok",
    completeness: clsByMin(p["Полнота кадров, %"], th.COMPLETENESS_ALARM_MIN_PCT, th.COMPLETENESS_OK_MIN_PCT),
    validity: clsByMin(p["Достоверные параметры, %"], th.VALIDITY_ALARM_MIN_PCT, th.VALIDITY_OK_MIN_PCT),
    invalid: clsByMax(p["Недостоверные параметры, шт"], th.INVALID_PARAMS_WARN_MAX, th.INVALID_PARAMS_ALARM_MAX),
    integrity: clsByMax(p["Ошибки контроля целостности, шт"], th.INTEGRITY_WARN_MAX, th.INTEGRITY_ALARM_MAX),
    wait: clsByMax(p["Превышения времени ожидания, шт"], th.WAIT_WARN_MAX, th.WAIT_ALARM_MAX),
    retry: clsByMax(p["Повторы кадров, шт"], th.RETRY_WARN_MAX, th.RETRY_ALARM_MAX),
    lost: clsByMax(p["Потерянные кадры, шт"], th.LOST_FRAMES_WARN_MAX, th.LOST_FRAMES_ALARM_MAX),
    sync: isBad(p["Синхронизация времени"]) ? "st-alarm" : "st-ok",
    buffer: isBad(p["Буферизация ТМИ"]) ? "st-alarm" : "st-ok",
    usable: isBad(p["Пригодность ТМИ для контроля"]) ? "st-alarm" : String(p["Пригодность ТМИ для контроля"] || "").toLowerCase().includes("огранич") ? "st-warn" : "st-ok",
  };
}

function egyptHeader(ctx, title){
  const { satNo, sat } = ctx;
  const sub = sat?.subsystems?.tmi;
  const st = sat?.inactive ? "inactive" : (sub?.st || "warn");
  const p = sub?.params || {};
  const th = TH.tmi;

  const ageMs = Date.now() - (sat?.lastUpdateMs || 0);
  const qualityOk = sat?.link === "ok" && ageMs <= th.AGE_ALARM_MS;
  const quality = qualityOk ? "достоверна" : "нет достоверной ТМИ";
  const qCls = qualityOk ? "st-ok" : "st-alarm";

  const stream = p["Поток ТМИ"] || "—";
  const src = p["Источник ТМИ"] || "—";

  return `
    <div class="egy-top">
      <div class="egy-title mono">[КА "${escapeHtml(String(satNo))}"] ТМИ/СБИ: ${escapeHtml(title)}</div>

      <div class="egy-line">
        <span class="badge ${badgeClass(st)}">${escapeHtml(stWord(st))}</span>
        <span class="chip ${qCls}">ТМИ: ${escapeHtml(quality)}</span>
        <span class="chip st-muted">ВО: <span class="mono">${escapeHtml(sat?.lastUpdate || "—")}</span></span>
        <span class="chip st-muted">Поток: <span class="mono">${escapeHtml(String(stream))}</span></span>
        <span class="chip st-muted">Источник: <span class="mono">${escapeHtml(String(src))}</span></span>

        <span class="egy-sep"></span>

        <button class="btn-mini" data-open-sub="tmi_current" data-open-title="ТМИ/СБИ: Текущее состояние">Текущее состояние</button>
        <button class="btn-mini" data-open-sub="tmi_control" data-open-title="ТМИ/СБИ: Контроль состояния">Контроль состояния</button>
        <button class="btn-mini" data-open-sub="tmi_quality" data-open-title="ТМИ/СБИ: Качество данных">Качество данных</button>
      </div>
    </div>
  `;
}

export function renderDetailTMI(ctx){
  return renderTmiCurrent(ctx);
}

export function renderDetailTMI_Control(ctx){
  return renderTmiControl(ctx);
}

export function renderDetailTMI_Current(ctx){
  return renderTmiCurrent(ctx);
}

export function renderDetailTMI_Quality(ctx){
  return renderTmiQuality(ctx);
}

function renderTmiCurrent(ctx){
  const { sat } = ctx;
  const p = sat?.subsystems?.tmi?.params || {};
  const th = TH.tmi;
  const c = classes(ctx);
  const ageMs = Date.now() - (sat?.lastUpdateMs || 0);

  return `
    <div class="egyfmt">
      ${egyptHeader(ctx, "Текущее состояние")}

      <div class="egy-sheet">
        <table class="egy-table" cellspacing="0" cellpadding="0">
          <tr>
            <td class="egytd-top" colspan="8">Текущие параметры ТМИ/СБИ</td>
          </tr>

          <tr>
            <td class="egytd-sec" colspan="8">Источник, поток и временная привязка</td>
          </tr>
          <tr>
            ${lcell("Источник ТМИ")}
            ${vcell(p["Источник ТМИ"], "st-muted")}
            ${lcell("Поток ТМИ")}
            ${vcell(p["Поток ТМИ"], "st-muted")}
            ${lcell("Окно анализа, с")}
            ${vcell(p["Окно анализа, с"] || th.WINDOW_S, "st-muted")}
            ${lcell("Возраст данных, мс")}
            ${vcell(ageMs, c.age)}
          </tr>

          <tr>
            <td class="egytd-sec" colspan="8">Полнота и достоверность</td>
          </tr>
          <tr>
            ${lcell("Полнота кадров, %")}
            ${vcell(p["Полнота кадров, %"], c.completeness)}
            ${lcell("Достоверные параметры, %")}
            ${vcell(p["Достоверные параметры, %"], c.validity)}
            ${lcell("Недостоверные параметры, шт")}
            ${vcell(p["Недостоверные параметры, шт"], c.invalid)}
            ${lcell("Пригодность ТМИ для контроля")}
            ${vcell(p["Пригодность ТМИ для контроля"], c.usable)}
          </tr>

          <tr>
            <td class="egytd-sec" colspan="8">Ошибки обмена и доставка кадров</td>
          </tr>
          <tr>
            ${lcell("Ошибки контроля целостности, шт")}
            ${vcell(p["Ошибки контроля целостности, шт"], c.integrity)}
            ${lcell("Превышения времени ожидания, шт")}
            ${vcell(p["Превышения времени ожидания, шт"], c.wait)}
            ${lcell("Повторы кадров, шт")}
            ${vcell(p["Повторы кадров, шт"], c.retry)}
            ${lcell("Потерянные кадры, шт")}
            ${vcell(p["Потерянные кадры, шт"], c.lost)}
          </tr>

          <tr>
            <td class="egytd-sec" colspan="8">Синхронизация и буферизация</td>
          </tr>
          <tr>
            ${lcell("Синхронизация времени")}
            ${vcell(p["Синхронизация времени"], c.sync)}
            ${lcell("Буферизация ТМИ")}
            ${vcell(p["Буферизация ТМИ"], c.buffer)}
            ${lcell("Источник времени")}
            ${vcell(th.TIME_SOURCE, "st-muted", `colspan="5"`)}
          </tr>
        </table>

        <div class="egy-footnote">
          <span class="mono">Назначение формата:</span> отображение текущего качества телеметрических данных, поступающих в алгоритмы контроля НКУ.
        </div>
      </div>
    </div>
  `;
}

function renderTmiControl(ctx){
  const { sat } = ctx;
  const sub = sat?.subsystems?.tmi;
  const p = sub?.params || {};
  const th = TH.tmi;
  const c = classes(ctx);
  const ageMs = Date.now() - (sat?.lastUpdateMs || 0);

  const st = sat?.inactive ? "inactive" : (sub?.st || "warn");
  const msg = sub?.msg || "—";

  const actionOverall =
    st === "ok" ? "штатный контроль" :
    st === "warn" ? "использовать ТМИ с ограничениями, проверить тренд качества данных" :
    st === "alarm" ? "не использовать данные для окончательной оценки систем без повторного получения ТМИ" :
    "ожидать ввода КА в эксплуатацию";

  const rows = [
    checkRow(
      "Актуальность ТМИ",
      `${ageMs} мс`,
      `предупреждение >${th.AGE_WARN_MS} мс; авария >${th.AGE_ALARM_MS} мс`,
      c.age,
      c.age === "st-ok" ? "данные актуальны" : c.age === "st-warn" ? "возраст ТМИ повышен" : "ТМИ устарела",
      c.age === "st-ok" ? "действий не требуется" : "повторить получение ТМИ или проверить канал"
    ),
    checkRow(
      "Полнота кадров",
      `${safe(p["Полнота кадров, %"])} %`,
      `норма ≥${th.COMPLETENESS_OK_MIN_PCT}%; предупреждение ${th.COMPLETENESS_ALARM_MIN_PCT}…${th.COMPLETENESS_OK_MIN_PCT}%; авария <${th.COMPLETENESS_ALARM_MIN_PCT}%`,
      c.completeness,
      c.completeness === "st-ok" ? "кадров достаточно" : c.completeness === "st-warn" ? "часть кадров отсутствует" : "потеря кадров мешает оценке",
      c.completeness === "st-ok" ? "действий не требуется" : "проверить поток ТМИ и запросить повтор"
    ),
    checkRow(
      "Достоверность параметров",
      `${safe(p["Достоверные параметры, %"])} %`,
      `норма ≥${th.VALIDITY_OK_MIN_PCT}%; предупреждение ${th.VALIDITY_ALARM_MIN_PCT}…${th.VALIDITY_OK_MIN_PCT}%; авария <${th.VALIDITY_ALARM_MIN_PCT}%`,
      c.validity,
      c.validity === "st-ok" ? "доля достоверных параметров достаточна" : c.validity === "st-warn" ? "часть параметров недостоверна" : "достоверность недостаточна",
      c.validity === "st-ok" ? "действий не требуется" : "исключить недостоверные параметры из расчёта состояния"
    ),
    checkRow(
      "Недостоверные параметры",
      p["Недостоверные параметры, шт"],
      `предупреждение >${th.INVALID_PARAMS_WARN_MAX}; авария >${th.INVALID_PARAMS_ALARM_MAX}`,
      c.invalid,
      c.invalid === "st-ok" ? "недостоверные параметры отсутствуют" : c.invalid === "st-warn" ? "есть недостоверные параметры" : "много недостоверных параметров",
      c.invalid === "st-ok" ? "действий не требуется" : "проверить источники параметров и не использовать их в агрегации"
    ),
    checkRow(
      "Ошибки контроля целостности",
      p["Ошибки контроля целостности, шт"],
      `предупреждение >${th.INTEGRITY_WARN_MAX}; авария >${th.INTEGRITY_ALARM_MAX}`,
      c.integrity,
      c.integrity === "st-ok" ? "целостность кадров подтверждается" : c.integrity === "st-warn" ? "рост ошибок целостности" : "ошибки целостности превышают аварийный порог",
      c.integrity === "st-ok" ? "действий не требуется" : "проверить канал, повторить критические кадры"
    ),
    checkRow(
      "Превышения времени ожидания",
      p["Превышения времени ожидания, шт"],
      `предупреждение >${th.WAIT_WARN_MAX}; авария >${th.WAIT_ALARM_MAX}`,
      c.wait,
      c.wait === "st-ok" ? "задержки обмена допустимы" : c.wait === "st-warn" ? "рост задержек" : "обмен не подтверждается в срок",
      c.wait === "st-ok" ? "действий не требуется" : "проверить расписание и тракт доставки ТМИ"
    ),
    checkRow(
      "Повторы кадров",
      p["Повторы кадров, шт"],
      `предупреждение >${th.RETRY_WARN_MAX}; авария >${th.RETRY_ALARM_MAX}`,
      c.retry,
      c.retry === "st-ok" ? "повторы незначительны" : c.retry === "st-warn" ? "рост повторов" : "чрезмерное число повторов",
      c.retry === "st-ok" ? "действий не требуется" : "проверить устойчивость канала ТМ/КИ"
    ),
    checkRow(
      "Потерянные кадры",
      p["Потерянные кадры, шт"],
      `предупреждение >${th.LOST_FRAMES_WARN_MAX}; авария >${th.LOST_FRAMES_ALARM_MAX}`,
      c.lost,
      c.lost === "st-ok" ? "потери кадров отсутствуют или малы" : c.lost === "st-warn" ? "зафиксированы потери кадров" : "потери кадров превышают аварийный порог",
      c.lost === "st-ok" ? "действий не требуется" : "повторить приём данных"
    ),
    checkRow(
      "Синхронизация времени",
      p["Синхронизация времени"],
      "для обработки ТМИ требуется корректная временная привязка",
      c.sync,
      c.sync === "st-ok" ? "временная привязка сохранена" : "синхронизация времени нарушена",
      c.sync === "st-ok" ? "действий не требуется" : "проверить источник времени и исключить несинхронные данные"
    )
  ].join("");

  return `
    <div class="egyfmt">
      ${egyptHeader(ctx, "Контроль состояния")}

      <div class="egy-sheet">
        <table class="egy-table" cellspacing="0" cellpadding="0">
          <tr>
            <td class="egytd-top" colspan="6">Итоговая оценка ТМИ/СБИ</td>
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
            <td class="egytd-sec" colspan="6">Результаты алгоритма контроля качества ТМИ</td>
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
          <span class="mono">Назначение формата:</span> определить, можно ли использовать поступившую ТМИ для оценки состояния бортовых систем, КА и группировки.
        </div>
      </div>
    </div>
  `;
}

function renderTmiQuality(ctx){
  const { sat } = ctx;
  const p = sat?.subsystems?.tmi?.params || {};
  const th = TH.tmi;
  const c = classes(ctx);
  const ageMs = Date.now() - (sat?.lastUpdateMs || 0);

  return `
    <div class="egyfmt">
      ${egyptHeader(ctx, "Качество данных")}

      <div class="egy-grid">
        <div class="egy-box">
          <div class="egy-box-h">Полнота и достоверность</div>
          ${cell("Полнота кадров, %", p["Полнота кадров, %"], c.completeness)}
          ${cell("Достоверные параметры, %", p["Достоверные параметры, %"], c.validity)}
          ${cell("Недостоверные параметры, шт", p["Недостоверные параметры, шт"], c.invalid)}
          ${cell("Пригодность ТМИ для контроля", p["Пригодность ТМИ для контроля"], c.usable)}
        </div>

        <div class="egy-box">
          <div class="egy-box-h">Доставка и временная привязка</div>
          ${cell("Возраст данных, мс", ageMs, c.age)}
          ${cell("Ошибки контроля целостности, шт", p["Ошибки контроля целостности, шт"], c.integrity)}
          ${cell("Превышения времени ожидания, шт", p["Превышения времени ожидания, шт"], c.wait)}
          ${cell("Синхронизация времени", p["Синхронизация времени"], c.sync)}
        </div>

        <div class="egy-box" style="grid-column:1 / -1;">
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
              ${rowCrit("Возраст данных, мс", ageMs, `≤ ${th.AGE_WARN_MS}`, `${th.AGE_WARN_MS}…${th.AGE_ALARM_MS}`, `> ${th.AGE_ALARM_MS}`)}
              ${rowCrit("Полнота кадров, %", p["Полнота кадров, %"], `≥ ${th.COMPLETENESS_OK_MIN_PCT}`, `${th.COMPLETENESS_ALARM_MIN_PCT}…${th.COMPLETENESS_OK_MIN_PCT}`, `< ${th.COMPLETENESS_ALARM_MIN_PCT}`)}
              ${rowCrit("Достоверные параметры, %", p["Достоверные параметры, %"], `≥ ${th.VALIDITY_OK_MIN_PCT}`, `${th.VALIDITY_ALARM_MIN_PCT}…${th.VALIDITY_OK_MIN_PCT}`, `< ${th.VALIDITY_ALARM_MIN_PCT}`)}
              ${rowCrit("Ошибки контроля целостности, шт", p["Ошибки контроля целостности, шт"], `≤ ${th.INTEGRITY_WARN_MAX}`, `${th.INTEGRITY_WARN_MAX}…${th.INTEGRITY_ALARM_MAX}`, `> ${th.INTEGRITY_ALARM_MAX}`)}
              ${rowCrit("Превышения времени ожидания, шт", p["Превышения времени ожидания, шт"], `≤ ${th.WAIT_WARN_MAX}`, `${th.WAIT_WARN_MAX}…${th.WAIT_ALARM_MAX}`, `> ${th.WAIT_ALARM_MAX}`)}
              ${rowCrit("Повторы кадров, шт", p["Повторы кадров, шт"], `≤ ${th.RETRY_WARN_MAX}`, `${th.RETRY_WARN_MAX}…${th.RETRY_ALARM_MAX}`, `> ${th.RETRY_ALARM_MAX}`)}
              ${rowCrit("Потерянные кадры, шт", p["Потерянные кадры, шт"], `≤ ${th.LOST_FRAMES_WARN_MAX}`, `${th.LOST_FRAMES_WARN_MAX}…${th.LOST_FRAMES_ALARM_MAX}`, `> ${th.LOST_FRAMES_ALARM_MAX}`)}
            </tbody>
          </table>
        </div>

        <div class="egy-box" style="grid-column:1 / -1;">
          <div class="egy-note">
            <div class="egy-note-row"><b>Норма:</b> данные актуальны, полны и достоверны; ошибки доставки не влияют на оценку систем.</div>
            <div class="egy-note-row"><b>Предупреждение:</b> данные ещё пригодны, но качество ухудшается; часть параметров может требовать исключения из агрегации.</div>
            <div class="egy-note-row"><b>Авария:</b> ТМИ непригодна для достоверной оценки состояния без повторного получения или восстановления канала.</div>
          </div>
        </div>
      </div>
    </div>
  `;
}