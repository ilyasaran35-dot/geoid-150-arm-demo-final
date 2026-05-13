import { escapeHtml } from "../../core/util.js";
import { TH } from "../../model/thresholds.js";

const TEMP_FIELDS = [
  "Температура БКУ/БВС, °C",
  "Температура СЭС, °C",
  "Температура АКБ, °C",
  "Температура СУДН, °C",
  "Температура ДУ, °C",
  "Температура БРК, °C",
  "Температура АФУ, °C",
  "Температура МСС, °C",
];

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

function isYes(value){
  const s = String(value || "").trim().toLowerCase();
  return s === "да" || s === "есть" || s === "сработал" || s === "сработала" || s === "отказ" || s === "нарушено" || s === "нарушена";
}

function isOff(value){
  const s = String(value || "").trim().toLowerCase();
  return s === "отключены" || s === "отключён" || s === "отключена" || s === "запрещены" || s === "запрещено" || s === "нет";
}

function resultWord(cls){
  if(cls === "st-ok") return "норма";
  if(cls === "st-warn") return "предупреждение";
  if(cls === "st-alarm") return "авария";
  return "не определено";
}

function zoneLimits(field){
  const th = TH.therm;
  const map = {
    "Температура БКУ/БВС, °C": [th.BKU_WARN_MIN_C, th.BKU_WARN_MAX_C, th.BKU_ALARM_MIN_C, th.BKU_ALARM_MAX_C],
    "Температура СЭС, °C": [th.SES_WARN_MIN_C, th.SES_WARN_MAX_C, th.SES_ALARM_MIN_C, th.SES_ALARM_MAX_C],
    "Температура АКБ, °C": [th.AKB_WARN_MIN_C, th.AKB_WARN_MAX_C, th.AKB_ALARM_MIN_C, th.AKB_ALARM_MAX_C],
    "Температура СУДН, °C": [th.SUDN_WARN_MIN_C, th.SUDN_WARN_MAX_C, th.SUDN_ALARM_MIN_C, th.SUDN_ALARM_MAX_C],
    "Температура ДУ, °C": [th.DU_WARN_MIN_C, th.DU_WARN_MAX_C, th.DU_ALARM_MIN_C, th.DU_ALARM_MAX_C],
    "Температура БРК, °C": [th.BRK_WARN_MIN_C, th.BRK_WARN_MAX_C, th.BRK_ALARM_MIN_C, th.BRK_ALARM_MAX_C],
    "Температура АФУ, °C": [th.AFU_WARN_MIN_C, th.AFU_WARN_MAX_C, th.AFU_ALARM_MIN_C, th.AFU_ALARM_MAX_C],
    "Температура МСС, °C": [th.MSS_WARN_MIN_C, th.MSS_WARN_MAX_C, th.MSS_ALARM_MIN_C, th.MSS_ALARM_MAX_C],
  };
  return map[field] || [0, 50, -10, 65];
}

function clsTemp(value, field){
  const t = num(value);
  if(t == null) return "st-muted";
  const [warnMin, warnMax, alarmMin, alarmMax] = zoneLimits(field);
  if(t <= alarmMin || t >= alarmMax) return "st-alarm";
  if(t <= warnMin || t >= warnMax) return "st-warn";
  return "st-ok";
}

function clsYesAlarm(value){
  return isYes(value) ? "st-alarm" : "st-ok";
}

function clsLimit(value){
  const s = String(value || "").trim().toLowerCase();
  return s === "есть" || s === "да" ? "st-warn" : "st-ok";
}

function clsHeater(value){
  const s = String(value || "").trim().toLowerCase();
  if(s === "отказ") return "st-alarm";
  if(isOff(value)) return "st-warn";
  return "st-ok";
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

function tempReason(cls, field){
  if(cls === "st-ok") return "температура в допустимом диапазоне";
  if(cls === "st-warn") return `${field.replace("Температура ", "")}: приближение к температурному пределу`;
  if(cls === "st-alarm") return `${field.replace("Температура ", "")}: выход за аварийный температурный предел`;
  return "нет достоверного значения";
}

function egyptHeader(ctx, title){
  const { satNo, sat } = ctx;
  const sub = sat?.subsystems?.therm;
  const st = sat?.inactive ? "inactive" : (sub?.st || "warn");
  const p = sub?.params || {};
  const th = TH.therm;

  const ageMs = Date.now() - (sat?.lastUpdateMs || 0);
  const qualityOk = sat?.link === "ok" && ageMs <= th.AGE_ALARM_MS;
  const quality = qualityOk ? "достоверна" : "нет достоверной ТМИ";
  const qCls = qualityOk ? "st-ok" : "st-alarm";
  const mode = p["Режим СОТР"] || "—";

  return `
    <div class="egy-top">
      <div class="egy-title mono">[КА "${escapeHtml(String(satNo))}"] СОТР: ${escapeHtml(title)}</div>

      <div class="egy-line">
        <span class="badge ${badgeClass(st)}">${escapeHtml(stWord(st))}</span>
        <span class="chip ${qCls}">ТМИ: ${escapeHtml(quality)}</span>
        <span class="chip st-muted">ВО: <span class="mono">${escapeHtml(sat?.lastUpdate || "—")}</span></span>
        <span class="chip st-muted">Режим: <span class="mono">${escapeHtml(String(mode))}</span></span>

        <span class="egy-sep"></span>

        <button class="btn-mini" data-open-sub="therm_current" data-open-title="СОТР: Текущее состояние">Текущее состояние</button>
        <button class="btn-mini" data-open-sub="therm_control" data-open-title="СОТР: Контроль состояния">Контроль состояния</button>
        <button class="btn-mini" data-open-sub="therm_zones" data-open-title="СОТР: Тепловые зоны">Тепловые зоны</button>
      </div>
    </div>
  `;
}

export function renderDetailTHERM(ctx){
  return renderThermCurrent(ctx);
}

export function renderDetailTHERM_Control(ctx){
  return renderThermControl(ctx);
}

export function renderDetailTHERM_Current(ctx){
  return renderThermCurrent(ctx);
}

export function renderDetailTHERM_Zones(ctx){
  return renderThermZones(ctx);
}

function renderThermCurrent(ctx){
  const { sat } = ctx;
  const p = sat?.subsystems?.therm?.params || {};
  const th = TH.therm;
  const ageMs = Date.now() - (sat?.lastUpdateMs || 0);
  const ageCls = ageMs > th.AGE_ALARM_MS ? "st-alarm" : ageMs > th.AGE_WARN_MS ? "st-warn" : "st-ok";

  return `
    <div class="egyfmt">
      ${egyptHeader(ctx, "Текущее состояние")}

      <div class="egy-sheet">
        <table class="egy-table" cellspacing="0" cellpadding="0">
          <tr>
            <td class="egytd-top" colspan="8">Текущие параметры СОТР</td>
          </tr>

          <tr>
            <td class="egytd-sec" colspan="8">Режим, алгоритм и достоверность данных</td>
          </tr>
          <tr>
            ${lcell("Режим СОТР")}
            ${vcell(p["Режим СОТР"], "st-muted")}
            ${lcell("Алгоритм СОТР")}
            ${vcell(p["Алгоритм СОТР"], "st-muted")}
            ${lcell("Экономичный режим обогрева")}
            ${vcell(p["Экономичный режим обогрева"], clsLimit(p["Экономичный режим обогрева"]))}
            ${lcell("Возраст данных, мс")}
            ${vcell(ageMs, ageCls)}
          </tr>

          <tr>
            <td class="egytd-sec" colspan="8">Температурные зоны служебных систем</td>
          </tr>
          <tr>
            ${lcell("Температура БКУ/БВС, °C")}
            ${vcell(p["Температура БКУ/БВС, °C"], clsTemp(p["Температура БКУ/БВС, °C"], "Температура БКУ/БВС, °C"))}
            ${lcell("Температура СЭС, °C")}
            ${vcell(p["Температура СЭС, °C"], clsTemp(p["Температура СЭС, °C"], "Температура СЭС, °C"))}
            ${lcell("Температура АКБ, °C")}
            ${vcell(p["Температура АКБ, °C"], clsTemp(p["Температура АКБ, °C"], "Температура АКБ, °C"))}
            ${lcell("Температура СУДН, °C")}
            ${vcell(p["Температура СУДН, °C"], clsTemp(p["Температура СУДН, °C"], "Температура СУДН, °C"))}
          </tr>
          <tr>
            ${lcell("Температура ДУ, °C")}
            ${vcell(p["Температура ДУ, °C"], clsTemp(p["Температура ДУ, °C"], "Температура ДУ, °C"))}
            ${lcell("Температура БРК, °C")}
            ${vcell(p["Температура БРК, °C"], clsTemp(p["Температура БРК, °C"], "Температура БРК, °C"))}
            ${lcell("Температура АФУ, °C")}
            ${vcell(p["Температура АФУ, °C"], clsTemp(p["Температура АФУ, °C"], "Температура АФУ, °C"))}
            ${lcell("Температура МСС, °C")}
            ${vcell(p["Температура МСС, °C"], clsTemp(p["Температура МСС, °C"], "Температура МСС, °C"))}
          </tr>

          <tr>
            <td class="egytd-sec" colspan="8">Сводные тепловые признаки</td>
          </tr>
          <tr>
            ${lcell("Минимальная температура, °C")}
            ${vcell(p["Минимальная температура, °C"], clsTemp(p["Минимальная температура, °C"], "Температура АКБ, °C"))}
            ${lcell("Максимальная температура, °C")}
            ${vcell(p["Максимальная температура, °C"], Number(p["Максимальная температура, °C"]) >= th.GROUP_OVERHEAT_ALARM_C ? "st-alarm" : Number(p["Максимальная температура, °C"]) >= th.GROUP_OVERHEAT_WARN_C ? "st-warn" : "st-ok")}
            ${lcell("Средняя температура, °C")}
            ${vcell(p["Средняя температура, °C"], "st-muted")}
            ${lcell("Тепловая защита")}
            ${vcell(p["Тепловая защита"], clsYesAlarm(p["Тепловая защита"]))}
          </tr>

          <tr>
            <td class="egytd-sec" colspan="8">Датчики, нагреватели и ограничения</td>
          </tr>
          <tr>
            ${lcell("Валидные датчики температуры, шт")}
            ${vcell(p["Валидные датчики температуры, шт"], Number(p["Валидные датчики температуры, шт"]) < th.VALID_SENSORS_ALARM_MIN ? "st-alarm" : Number(p["Валидные датчики температуры, шт"]) < th.VALID_SENSORS_WARN_MIN ? "st-warn" : "st-ok")}
            ${lcell("Недостоверные датчики температуры, шт")}
            ${vcell(p["Недостоверные датчики температуры, шт"], Number(p["Недостоверные датчики температуры, шт"]) >= th.BAD_SENSORS_ALARM_MAX ? "st-alarm" : Number(p["Недостоверные датчики температуры, шт"]) >= th.BAD_SENSORS_WARN_MAX ? "st-warn" : "st-ok")}
            ${lcell("Отказ датчика температуры")}
            ${vcell(p["Отказ датчика температуры"], clsYesAlarm(p["Отказ датчика температуры"]))}
            ${lcell("Управление нагревателями")}
            ${vcell(p["Управление нагревателями"], clsHeater(p["Управление нагревателями"]))}
          </tr>
          <tr>
            ${lcell("Ограничение БРК/АФУ по температуре")}
            ${vcell(p["Ограничение БРК/АФУ по температуре"], clsLimit(p["Ограничение БРК/АФУ по температуре"]))}
            ${lcell("Ограничение ДУ по температуре")}
            ${vcell(p["Ограничение ДУ по температуре"], clsLimit(p["Ограничение ДУ по температуре"]))}
            ${lcell("Ограничение СЭС по температуре")}
            ${vcell(p["Ограничение СЭС по температуре"], clsLimit(p["Ограничение СЭС по температуре"]))}
            ${lcell("Радиатор полезной нагрузки")}
            ${vcell(p["Радиатор полезной нагрузки"], String(p["Радиатор полезной нагрузки"] || "").toLowerCase() === "отказ" ? "st-alarm" : String(p["Радиатор полезной нагрузки"] || "").toLowerCase().includes("снижен") ? "st-warn" : "st-ok")}
          </tr>
        </table>

        <div class="egy-footnote">
          <span class="mono">Назначение формата:</span> отображение фактического теплового состояния КА связи и признаков ограничения смежных систем по температуре.
        </div>
      </div>
    </div>
  `;
}

function renderThermControl(ctx){
  const { sat } = ctx;
  const sub = sat?.subsystems?.therm;
  const p = sub?.params || {};
  const th = TH.therm;
  const ageMs = Date.now() - (sat?.lastUpdateMs || 0);
  const st = sat?.inactive ? "inactive" : (sub?.st || "warn");
  const msg = sub?.msg || "—";
  const ageCls = ageMs > th.AGE_ALARM_MS ? "st-alarm" : ageMs > th.AGE_WARN_MS ? "st-warn" : "st-ok";

  const actionOverall =
    st === "ok" ? "штатный контроль" :
    st === "warn" ? "проверить температурные тренды, работу нагревателей и ограничения смежных систем" :
    st === "alarm" ? "ограничить тепловыделяющие режимы, проверить СОТР, датчики температуры и смежные системы" :
    "ожидать ввода КА в эксплуатацию";

  const zoneRows = TEMP_FIELDS.map((field)=>{
    const cls = clsTemp(p[field], field);
    const [warnMin, warnMax, alarmMin, alarmMax] = zoneLimits(field);
    return checkRow(
      field,
      `${safe(p[field])} °C`,
      `норма ${warnMin}…${warnMax} °C; авария ≤${alarmMin} или ≥${alarmMax} °C`,
      cls,
      tempReason(cls, field),
      cls === "st-ok" ? "действий не требуется" : field.includes("БРК") || field.includes("АФУ") ? "проверить режим БРК/АФУ и радиатор полезной нагрузки" : field.includes("ДУ") ? "проверить готовность ДУ и тепловые ограничения манёвра" : "проверить нагреватели, датчики и режим СОТР"
    );
  }).join("");

  const rows = `
    ${checkRow(
      "Актуальность ТМИ СОТР",
      `${ageMs} мс`,
      `предупреждение >${th.AGE_WARN_MS} мс; авария >${th.AGE_ALARM_MS} мс`,
      ageCls,
      ageCls === "st-ok" ? "данные актуальны" : ageCls === "st-warn" ? "возраст данных повышен" : "данные СОТР устарели",
      ageCls === "st-ok" ? "продолжить контроль" : "проверить канал ТМ/КИ и повторить получение ТМИ"
    )}
    ${checkRow(
      "Датчики температуры",
      `валидные ${safe(p["Валидные датчики температуры, шт"])}; недостоверные ${safe(p["Недостоверные датчики температуры, шт"])}`,
      `валидные ≥${th.VALID_SENSORS_WARN_MIN}; недостоверные <${th.BAD_SENSORS_ALARM_MAX}`,
      Number(p["Недостоверные датчики температуры, шт"]) >= th.BAD_SENSORS_ALARM_MAX || Number(p["Валидные датчики температуры, шт"]) < th.VALID_SENSORS_ALARM_MIN || isYes(p["Отказ датчика температуры"]) ? "st-alarm" : Number(p["Недостоверные датчики температуры, шт"]) >= th.BAD_SENSORS_WARN_MAX || Number(p["Валидные датчики температуры, шт"]) < th.VALID_SENSORS_WARN_MIN ? "st-warn" : "st-ok",
      "оценка пригодности температурных измерений",
      "при деградации исключить недостоверные ДТ из агрегации и проверить резервные каналы"
    )}
    ${checkRow(
      "Управление нагревателями",
      p["Управление нагревателями"],
      "в штатном режиме управление нагревателями должно быть автоматическим",
      clsHeater(p["Управление нагревателями"]),
      clsHeater(p["Управление нагревателями"]) === "st-ok" ? "управление нагревателями доступно" : "управление нагревателями ограничено или отказало",
      clsHeater(p["Управление нагревателями"]) === "st-ok" ? "действий не требуется" : "проверить команды СОТР и состояние фидеров нагревателей"
    )}
    ${checkRow(
      "Радиатор полезной нагрузки",
      p["Радиатор полезной нагрузки"],
      "норма — теплоотвод не ограничивает БРК/АФУ",
      String(p["Радиатор полезной нагрузки"] || "").toLowerCase() === "отказ" ? "st-alarm" : String(p["Радиатор полезной нагрузки"] || "").toLowerCase().includes("снижен") ? "st-warn" : "st-ok",
      "оценка теплоотвода целевой аппаратуры",
      "при деградации ограничить режимы БРК/АФУ и проверить тепловые тренды"
    )}
    ${checkRow(
      "Смежные ограничения",
      `БРК/АФУ: ${safe(p["Ограничение БРК/АФУ по температуре"])}; ДУ: ${safe(p["Ограничение ДУ по температуре"])}; СЭС: ${safe(p["Ограничение СЭС по температуре"])}`,
      "ограничения должны отсутствовать в штатном тепловом режиме",
      clsLimit(p["Ограничение БРК/АФУ по температуре"]) === "st-warn" || clsLimit(p["Ограничение ДУ по температуре"]) === "st-warn" || clsLimit(p["Ограничение СЭС по температуре"]) === "st-warn" ? "st-warn" : "st-ok",
      "оценка влияния СОТР на смежные системы",
      "при наличии ограничения согласовать режимы БРК/АФУ, ДУ и СЭС"
    )}
  `;

  return `
    <div class="egyfmt">
      ${egyptHeader(ctx, "Контроль состояния")}

      <div class="egy-sheet">
        <table class="egy-table" cellspacing="0" cellpadding="0">
          <tr>
            <td class="egytd-top" colspan="6">Итоговая оценка состояния СОТР</td>
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
            <td class="egytd-sec" colspan="6">Результаты алгоритма контроля теплового режима</td>
          </tr>
          <tr>
            <td class="egytd-sec">Контролируемый признак</td>
            <td class="egytd-sec">Значение</td>
            <td class="egytd-sec">Критерий</td>
            <td class="egytd-sec">Состояние</td>
            <td class="egytd-sec">Причина</td>
            <td class="egytd-sec">Действие</td>
          </tr>
          ${zoneRows}
          ${rows}
        </table>

        <div class="egy-footnote">
          <span class="mono">Назначение формата:</span> объяснить, почему СОТР получила состояние «норма», «предупреждение» или «авария» по температурным зонам, датчикам и исполнительным элементам.
        </div>
      </div>
    </div>
  `;
}

function renderThermZones(ctx){
  const { sat } = ctx;
  const p = sat?.subsystems?.therm?.params || {};
  const th = TH.therm;
  const ageMs = Date.now() - (sat?.lastUpdateMs || 0);

  return `
    <div class="egyfmt">
      ${egyptHeader(ctx, "Тепловые зоны")}

      <div class="egy-grid">
        <div class="egy-box">
          <div class="egy-box-h">Служебные системы</div>
          ${cell("БКУ/БВС, °C", p["Температура БКУ/БВС, °C"], clsTemp(p["Температура БКУ/БВС, °C"], "Температура БКУ/БВС, °C"))}
          ${cell("СЭС, °C", p["Температура СЭС, °C"], clsTemp(p["Температура СЭС, °C"], "Температура СЭС, °C"))}
          ${cell("АКБ, °C", p["Температура АКБ, °C"], clsTemp(p["Температура АКБ, °C"], "Температура АКБ, °C"))}
          ${cell("СУДН, °C", p["Температура СУДН, °C"], clsTemp(p["Температура СУДН, °C"], "Температура СУДН, °C"))}
        </div>

        <div class="egy-box">
          <div class="egy-box-h">Целевая аппаратура и исполнительные системы</div>
          ${cell("ДУ, °C", p["Температура ДУ, °C"], clsTemp(p["Температура ДУ, °C"], "Температура ДУ, °C"))}
          ${cell("БРК, °C", p["Температура БРК, °C"], clsTemp(p["Температура БРК, °C"], "Температура БРК, °C"))}
          ${cell("АФУ, °C", p["Температура АФУ, °C"], clsTemp(p["Температура АФУ, °C"], "Температура АФУ, °C"))}
          ${cell("МСС, °C", p["Температура МСС, °C"], clsTemp(p["Температура МСС, °C"], "Температура МСС, °C"))}
        </div>

        <div class="egy-box">
          <div class="egy-box-h">Исполнительные элементы СОТР</div>
          ${cell("Нагреватели АКБ", p["Нагреватели АКБ"], clsHeater(p["Нагреватели АКБ"]))}
          ${cell("Нагреватели ДУ", p["Нагреватели ДУ"], clsHeater(p["Нагреватели ДУ"]))}
          ${cell("Нагреватели БКУ/БВС", p["Нагреватели БКУ/БВС"], clsHeater(p["Нагреватели БКУ/БВС"]))}
          ${cell("Нагреватели СУДН", p["Нагреватели СУДН"], clsHeater(p["Нагреватели СУДН"]))}
          ${cell("Нагреватели БРК/АФУ", p["Нагреватели БРК/АФУ"], clsHeater(p["Нагреватели БРК/АФУ"]))}
        </div>

        <div class="egy-box" style="grid-column:1 / -1;">
          <div class="egy-box-h">Критерии температурных зон</div>
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
              ${TEMP_FIELDS.map((field)=>{
                const [warnMin, warnMax, alarmMin, alarmMax] = zoneLimits(field);
                return rowCrit(field, p[field], `${warnMin}…${warnMax} °C`, `${alarmMin}…${warnMin} или ${warnMax}…${alarmMax} °C`, `≤ ${alarmMin} или ≥ ${alarmMax} °C`);
              }).join("")}
              ${rowCrit("Возраст данных СОТР, мс", ageMs, `≤ ${th.AGE_WARN_MS}`, `${th.AGE_WARN_MS}…${th.AGE_ALARM_MS}`, `> ${th.AGE_ALARM_MS}`)}
            </tbody>
          </table>
        </div>

        <div class="egy-box" style="grid-column:1 / -1;">
          <div class="egy-note">
            <div class="egy-note-row"><b>Норма:</b> температуры всех контролируемых зон находятся в рабочих диапазонах, датчики достоверны, управление нагревателями доступно.</div>
            <div class="egy-note-row"><b>Предупреждение:</b> температура приближается к пределу, снижается достоверность части датчиков или появляется ограничение смежной системы.</div>
            <div class="egy-note-row"><b>Авария:</b> перегрев, переохлаждение, отказ управления нагревателями, отказ радиатора полезной нагрузки или недостаточность температурной ТМИ.</div>
          </div>
        </div>
      </div>
    </div>
  `;
}
