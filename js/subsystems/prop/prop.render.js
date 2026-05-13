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

function isActive(value){
  const s = String(value || "").trim().toLowerCase();
  return s === "идёт" || s === "выполняется" || s === "есть" || s === "активен" || s === "да";
}

function isBadEvent(value){
  const s = String(value || "").trim().toLowerCase();
  return s === "да" || s === "есть" || s === "сработал" || s === "сработала" || s === "отказ" || s === "ошибка" || s === "запрещена" || s === "запрещено";
}

function isNotReady(value){
  const s = String(value || "").trim().toLowerCase();
  return s === "не готова" || s === "не готов" || s === "нет" || s === "отказ" || s === "ошибка";
}

function clsByMax(v, warnMax, alarmMax){
  const n = num(v);
  if(n == null) return "st-muted";
  if(n >= alarmMax) return "st-alarm";
  if(n >= warnMax) return "st-warn";
  return "st-ok";
}

function clsByMin(v, warnMin, alarmMin){
  const n = num(v);
  if(n == null) return "st-muted";
  if(n <= alarmMin) return "st-alarm";
  if(n <= warnMin) return "st-warn";
  return "st-ok";
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
  const p = ctx.sat?.subsystems?.prop?.params || {};
  const th = TH.prop;
  const dvDelta = num(p["Расхождение ΔV, мм/с"]);

  return {
    ready: isNotReady(p["Готовность ДУ"]) ? "st-warn" : "st-ok",
    permit: isBadEvent(p["Разрешение работы ДУ"]) || String(p["Разрешение работы ДУ"] || "").toLowerCase().includes("запр") ? "st-alarm" : "st-ok",
    maneuver: isActive(p["Манёвр ДУ"]) ? "st-warn" : "st-ok",
    impulse: isActive(p["Флаг импульса коррекции"]) ? "st-warn" : "st-ok",
    pressure: clsByMin(p["Давление магистрали рабочего тела, бар"], th.MAG_PRESS_WARN_MIN_BAR, th.MAG_PRESS_ALARM_MIN_BAR),
    temp: clsByMax(p["Температура ДУ, °C"], th.TEMP_WARN_MAX_C, th.TEMP_ALARM_MAX_C),
    supply: clsByMin(p["Напряжение питания ДУ, В"], th.SUPPLY_WARN_MIN_V, th.SUPPLY_ALARM_MIN_V),
    thrust: isActive(p["Манёвр ДУ"]) ? clsByMin(p["Тяга, мН"], th.THRUST_ACTIVE_MIN_MN, th.THRUST_ACTIVE_MIN_MN * 0.5) : "st-muted",
    dv: dvDelta == null ? "st-muted" : clsByMax(dvDelta, th.DV_WARN_MMS, th.DV_ALARM_MMS),
    duration: clsByMax(p["Длительность импульса, с"], th.MANEUVER_TIMEOUT_S * 0.7, th.MANEUVER_TIMEOUT_S),
    valve: isBadEvent(p["Отказ клапана подачи"]) ? "st-alarm" : "st-ok",
    power: isNotReady(p["Состояние источника питания ДУ"]) ? "st-warn" : "st-ok",
    ban: isBadEvent(p["Запрет ДУ"]) ? "st-alarm" : "st-ok",
    forbidden: isBadEvent(p["Запрещённая конфигурация ДУ"]) ? "st-alarm" : "st-ok",
    ack: isNotReady(p["Квитанции команд ДУ"]) ? "st-warn" : "st-ok",
    tm: isNotReady(p["Телеметрия ДУ"]) ? "st-warn" : "st-ok",
  };
}

function egyptHeader(ctx, title){
  const { satNo, sat } = ctx;
  const sub = sat?.subsystems?.prop;
  const st = sat?.inactive ? "inactive" : (sub?.st || "warn");
  const p = sub?.params || {};
  const th = TH.prop;

  const ageMs = Date.now() - (sat?.lastUpdateMs || 0);
  const qualityOk = (sat?.link === "ok" && ageMs <= th.AGE_ALARM_MS);
  const quality = qualityOk ? "достоверна" : "нет достоверной ТМИ";
  const qCls = qualityOk ? "st-ok" : "st-alarm";

  return `
    <div class="egy-top">
      <div class="egy-title mono">[КА "${escapeHtml(String(satNo))}"] ДУ: ${escapeHtml(title)}</div>

      <div class="egy-line">
        <span class="badge ${badgeClass(st)}">${escapeHtml(stWord(st))}</span>
        <span class="chip ${qCls}">ТМИ: ${escapeHtml(quality)}</span>
        <span class="chip st-muted">ВО: <span class="mono">${escapeHtml(sat?.lastUpdate || "—")}</span></span>
        <span class="chip st-muted">Режим: <span class="mono">${escapeHtml(String(p["Режим ДУ"] || "—"))}</span></span>
        <span class="chip st-muted">Манёвр: <span class="mono">${escapeHtml(String(p["Манёвр ДУ"] || "—"))}</span></span>

        <span class="egy-sep"></span>

        <button class="btn-mini" data-open-sub="prop_current" data-open-title="ДУ: Текущее состояние">Текущее состояние</button>
        <button class="btn-mini" data-open-sub="prop_control" data-open-title="ДУ: Контроль состояния">Контроль состояния</button>
        <button class="btn-mini" data-open-sub="prop_maneuver" data-open-title="ДУ: Манёвр и импульс">Манёвр и импульс</button>
      </div>
    </div>
  `;
}

export function renderDetailPROP(ctx){
  return renderPropCurrent(ctx);
}

export function renderDetailPROP_Control(ctx){
  return renderPropControl(ctx);
}

export function renderDetailPROP_Current(ctx){
  return renderPropCurrent(ctx);
}

export function renderDetailPROP_Maneuver(ctx){
  return renderPropManeuver(ctx);
}

function renderPropCurrent(ctx){
  const { sat } = ctx;
  const p = sat?.subsystems?.prop?.params || {};
  const c = classes(ctx);

  return `
    <div class="egyfmt">
      ${egyptHeader(ctx, "Текущее состояние")}

      <div class="egy-sheet">
        <table class="egy-table" cellspacing="0" cellpadding="0">
          <tr><td class="egytd-top" colspan="8">Текущие параметры ДУ</td></tr>

          <tr><td class="egytd-sec" colspan="8">Режим и готовность</td></tr>
          <tr>
            ${lcell("Тип ДУ")}${vcell(p["Тип ДУ"], "st-muted")}
            ${lcell("Режим ДУ")}${vcell(p["Режим ДУ"], "st-muted")}
            ${lcell("Состояние автомата ДУ")}${vcell(p["Состояние автомата ДУ"], "st-muted")}
            ${lcell("Готовность ДУ")}${vcell(p["Готовность ДУ"], c.ready)}
          </tr>
          <tr>
            ${lcell("Разрешение работы ДУ")}${vcell(p["Разрешение работы ДУ"], c.permit)}
            ${lcell("Состояние источника питания ДУ")}${vcell(p["Состояние источника питания ДУ"], c.power)}
            ${lcell("Квитанции команд ДУ")}${vcell(p["Квитанции команд ДУ"], c.ack)}
            ${lcell("Телеметрия ДУ")}${vcell(p["Телеметрия ДУ"], c.tm)}
          </tr>

          <tr><td class="egytd-sec" colspan="8">Физические параметры ДУ</td></tr>
          <tr>
            ${lcell("Давление магистрали рабочего тела, бар")}${vcell(p["Давление магистрали рабочего тела, бар"], c.pressure)}
            ${lcell("Температура ДУ, °C")}${vcell(p["Температура ДУ, °C"], c.temp)}
            ${lcell("Напряжение питания ДУ, В")}${vcell(p["Напряжение питания ДУ, В"], c.supply)}
            ${lcell("Ток ДУ, А")}${vcell(p["Ток ДУ, А"], "st-muted")}
          </tr>
          <tr>
            ${lcell("Тяга, мН")}${vcell(p["Тяга, мН"], c.thrust)}
            ${lcell("Клапан подачи рабочего тела")}${vcell(p["Клапан подачи рабочего тела"], "st-muted")}
            ${lcell("Отказ клапана подачи")}${vcell(p["Отказ клапана подачи"], c.valve)}
            ${lcell("Запрет ДУ")}${vcell(p["Запрет ДУ"], c.ban)}
          </tr>
          <tr>
            ${lcell("Запрещённая конфигурация ДУ")}${vcell(p["Запрещённая конфигурация ДУ"], c.forbidden, `colspan="7"`)}
          </tr>
        </table>

        <div class="egy-footnote">
          <span class="mono">Назначение формата:</span> показать фактическое состояние двигательной установки без развернутой интерпретации манёвра. Манёвр и расхождение ΔV вынесены в отдельный формат.
        </div>
      </div>
    </div>
  `;
}

function renderPropControl(ctx){
  const { sat } = ctx;
  const sub = sat?.subsystems?.prop;
  const p = sub?.params || {};
  const th = TH.prop;
  const c = classes(ctx);

  const st = sat?.inactive ? "inactive" : (sub?.st || "warn");
  const msg = sub?.msg || "—";
  const ageMs = Date.now() - (sat?.lastUpdateMs || 0);
  const tmiCls = sat?.link === "ok" && ageMs <= th.AGE_ALARM_MS ? "st-ok" : "st-alarm";
  const dvDelta = safe(p["Расхождение ΔV, мм/с"]);

  const actionOverall =
    st === "ok" ? "штатный контроль" :
    st === "warn" ? "проверить готовность ДУ, давление, питание и параметры импульса" :
    st === "alarm" ? "запретить продолжение манёвра до анализа ДУ, СУДН и ТМИ" :
    "ожидать ввода КА в эксплуатацию";

  const rows = [
    checkRow(
      "Качество ТМИ ДУ",
      tmiCls === "st-ok" ? "достоверна" : "нет достоверной ТМИ",
      `возраст ТМИ ≤ ${th.AGE_ALARM_MS} мс`,
      tmiCls,
      tmiCls === "st-ok" ? "данные пригодны для контроля" : "данные нельзя использовать как достоверные",
      tmiCls === "st-ok" ? "продолжить контроль" : "проверить канал ТМ/КИ"
    ),
    checkRow(
      "Готовность ДУ",
      p["Готовность ДУ"],
      "ДУ должна быть готова до разрешения импульса коррекции",
      c.ready,
      c.ready === "st-ok" ? "готовность подтверждена" : "готовность ДУ не подтверждена",
      c.ready === "st-ok" ? "действий не требуется" : "запретить коррекцию до уточнения готовности"
    ),
    checkRow(
      "Давление магистрали рабочего тела",
      `${safe(p["Давление магистрали рабочего тела, бар"])} бар`,
      `норма >${th.MAG_PRESS_WARN_MIN_BAR} бар; предупреждение ${th.MAG_PRESS_ALARM_MIN_BAR}…${th.MAG_PRESS_WARN_MIN_BAR}; авария ≤${th.MAG_PRESS_ALARM_MIN_BAR}`,
      c.pressure,
      c.pressure === "st-ok" ? "давление достаточно" : c.pressure === "st-warn" ? "снижение давления" : "давление ниже аварийного порога",
      c.pressure === "st-ok" ? "действий не требуется" : "проверить магистраль рабочего тела и готовность импульса"
    ),
    checkRow(
      "Температура ДУ",
      `${safe(p["Температура ДУ, °C"])} °C`,
      `норма <${th.TEMP_WARN_MAX_C} °C; предупреждение ${th.TEMP_WARN_MAX_C}…${th.TEMP_ALARM_MAX_C}; авария ≥${th.TEMP_ALARM_MAX_C}`,
      c.temp,
      c.temp === "st-ok" ? "температура допустима" : c.temp === "st-warn" ? "температура повышена" : "перегрев ДУ",
      c.temp === "st-ok" ? "действий не требуется" : "проверить СОТР и запретить длительный импульс"
    ),
    checkRow(
      "Напряжение питания ДУ",
      `${safe(p["Напряжение питания ДУ, В"])} В`,
      `норма >${th.SUPPLY_WARN_MIN_V} В; предупреждение ${th.SUPPLY_ALARM_MIN_V}…${th.SUPPLY_WARN_MIN_V}; авария ≤${th.SUPPLY_ALARM_MIN_V}`,
      c.supply,
      c.supply === "st-ok" ? "питание ДУ в норме" : c.supply === "st-warn" ? "снижение напряжения питания" : "питание ДУ ниже аварийного порога",
      c.supply === "st-ok" ? "действий не требуется" : "проверить СЭС и источник питания ДУ"
    ),
    checkRow(
      "Отказ клапана подачи",
      p["Отказ клапана подачи"],
      "отказ клапана = аварийный признак",
      c.valve,
      c.valve === "st-ok" ? "отказ клапана не зафиксирован" : "зафиксирован отказ клапана",
      c.valve === "st-ok" ? "действий не требуется" : "запретить импульс и проверить ДУ"
    ),
    checkRow(
      "Расхождение ΔV",
      `${dvDelta} мм/с`,
      `норма <${th.DV_WARN_MMS}; предупреждение ${th.DV_WARN_MMS}…${th.DV_ALARM_MMS}; авария ≥${th.DV_ALARM_MMS}`,
      c.dv,
      c.dv === "st-ok" ? "фактический импульс соответствует плану" : c.dv === "st-warn" ? "расхождение ΔV повышено" : "расхождение ΔV аварийное",
      c.dv === "st-ok" ? "действий не требуется" : "проверить СУДН, расчёт манёвра и выполнение импульса"
    ),
    checkRow(
      "Запрет и конфигурация ДУ",
      `запрет: ${safe(p["Запрет ДУ"])}; конфигурация: ${safe(p["Запрещённая конфигурация ДУ"])}`,
      "запрет ДУ или запрещённая конфигурация = авария",
      c.ban === "st-alarm" || c.forbidden === "st-alarm" ? "st-alarm" : "st-ok",
      c.ban === "st-alarm" || c.forbidden === "st-alarm" ? "зафиксирован запрет или запрещённая конфигурация" : "запреты отсутствуют",
      c.ban === "st-alarm" || c.forbidden === "st-alarm" ? "не выдавать команды ДУ" : "действий не требуется"
    )
  ].join("");

  return `
    <div class="egyfmt">
      ${egyptHeader(ctx, "Контроль состояния")}

      <div class="egy-sheet">
        <table class="egy-table" cellspacing="0" cellpadding="0">
          <tr><td class="egytd-top" colspan="6">Итоговая оценка состояния ДУ</td></tr>
          <tr>
            ${lcell("Итоговое состояние")}${vcell(stWord(st), badgeClass(st))}
            ${lcell("Причина")}${vcell(msg, badgeClass(st))}
            ${lcell("Действие оператора")}${vcell(actionOverall, "st-muted")}
          </tr>
          <tr><td class="egytd-sec" colspan="6">Результаты алгоритма контроля</td></tr>
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
          <span class="mono">Назначение формата:</span> объяснить состояние ДУ как исполнительной части коррекции орбиты, связанной с СУДН и ΔV манёвра.
        </div>
      </div>
    </div>
  `;
}

function renderPropManeuver(ctx){
  const { sat } = ctx;
  const p = sat?.subsystems?.prop?.params || {};
  const th = TH.prop;
  const c = classes(ctx);

  return `
    <div class="egyfmt">
      ${egyptHeader(ctx, "Манёвр и импульс")}

      <div class="egy-grid">
        <div class="egy-box">
          <div class="egy-box-h">Состояние импульса коррекции</div>
          ${cell("Флаг импульса коррекции", p["Флаг импульса коррекции"], c.impulse)}
          ${cell("Манёвр ДУ", p["Манёвр ДУ"], c.maneuver)}
          ${cell("Тип коррекции", p["Тип коррекции"], "st-muted")}
          ${cell("Состояние автомата ДУ", p["Состояние автомата ДУ"], "st-muted")}
          ${cell("Таймер до включения ДУ, с", p["Таймер до включения ДУ, с"], "st-muted")}
          ${cell("Длительность импульса, с", p["Длительность импульса, с"], c.duration)}
          ${cell("Таймер после импульса, с", p["Таймер после импульса, с"], "st-muted")}
        </div>

        <div class="egy-box">
          <div class="egy-box-h">Контроль ΔV</div>
          ${cell("Плановое ΔV, мм/с", p["Плановое ΔV, мм/с"], "st-muted")}
          ${cell("Фактическое ΔV, мм/с", p["Фактическое ΔV, мм/с"], "st-muted")}
          ${cell("Расхождение ΔV, мм/с", p["Расхождение ΔV, мм/с"], c.dv)}
          ${cell("Тяга, мН", p["Тяга, мН"], c.thrust)}
          ${cell("Клапан подачи рабочего тела", p["Клапан подачи рабочего тела"], "st-muted")}
          ${cell("Отказ клапана подачи", p["Отказ клапана подачи"], c.valve)}
        </div>

        <div class="egy-box" style="grid-column:1 / -1;">
          <div class="egy-box-h">Автомат состояний ДУ</div>
          <table class="ptable">
            <thead>
              <tr>
                <th>Состояние</th>
                <th>Условие входа</th>
                <th>Условие выхода</th>
                <th>Действие</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>ожидание</td><td>коррекция не запланирована</td><td>появился флаг импульса</td><td>контроль готовности ДУ</td></tr>
              <tr><td>подготовка</td><td>флаг импульса коррекции есть</td><td>разрешение работы ДУ и готовность подтверждены</td><td>подготовка источника питания и клапана подачи</td></tr>
              <tr><td>выдача импульса</td><td>манёвр ДУ идёт</td><td>импульс завершён или возник запрет</td><td>контроль тяги, длительности и ΔV</td></tr>
              <tr><td>постконтроль</td><td>импульс завершён</td><td>завершена оценка фактического ΔV</td><td>сравнение планового и фактического ΔV</td></tr>
              <tr><td>запрет</td><td>запрет ДУ или запрещённая конфигурация</td><td>снятие запрета по регламенту</td><td>блокировка команд ДУ</td></tr>
            </tbody>
          </table>
        </div>

        <div class="egy-box" style="grid-column:1 / -1;">
          <div class="egy-box-h">Критерии контроля манёвра</div>
          <table class="ptable">
            <thead>
              <tr>
                <th>Показатель</th>
                <th style="width:120px">Текущее</th>
                <th>Норма</th>
                <th>Предупреждение</th>
                <th>Авария</th>
              </tr>
            </thead>
            <tbody>
              ${rowCrit("Расхождение ΔV, мм/с", p["Расхождение ΔV, мм/с"], `< ${th.DV_WARN_MMS}`, `${th.DV_WARN_MMS}…${th.DV_ALARM_MMS}`, `≥ ${th.DV_ALARM_MMS}`)}
              ${rowCrit("Длительность импульса, с", p["Длительность импульса, с"], `< ${th.MANEUVER_TIMEOUT_S * 0.7}`, `${Math.round(th.MANEUVER_TIMEOUT_S * 0.7)}…${th.MANEUVER_TIMEOUT_S}`, `≥ ${th.MANEUVER_TIMEOUT_S}`)}
              ${rowCrit("Давление магистрали рабочего тела, бар", p["Давление магистрали рабочего тела, бар"], `> ${th.MAG_PRESS_WARN_MIN_BAR}`, `${th.MAG_PRESS_ALARM_MIN_BAR}…${th.MAG_PRESS_WARN_MIN_BAR}`, `≤ ${th.MAG_PRESS_ALARM_MIN_BAR}`)}
              ${rowCrit("Температура ДУ, °C", p["Температура ДУ, °C"], `< ${th.TEMP_WARN_MAX_C}`, `${th.TEMP_WARN_MAX_C}…${th.TEMP_ALARM_MAX_C}`, `≥ ${th.TEMP_ALARM_MAX_C}`)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}
