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

function isFailure(value){
  const s = String(value || "").trim().toLowerCase();
  return (
    s === "отказ" ||
    s === "авария" ||
    s === "нарушена" ||
    s === "нарушен" ||
    s === "неисправен" ||
    s === "неисправна" ||
    s === "сработала" ||
    s === "да" ||
    s === "запрещено"
  );
}

function isMissing(value){
  const s = String(value || "").trim().toLowerCase();
  return s === "нет" || isFailure(value);
}

function clsMoreBetter(v, alarmMin, okMin){
  const n = num(v);
  if(n == null) return "st-muted";
  if(n > alarmMin) return "st-alarm";
  if(n > okMin) return "st-warn";
  return "st-ok";
}

function clsAbsLessBetter(v, warnMax, alarmMax){
  const n = num(v);
  if(n == null) return "st-muted";
  const a = Math.abs(n);
  if(a > alarmMax) return "st-alarm";
  if(a > warnMax) return "st-warn";
  return "st-ok";
}

function clsLessBetter(v, warnMax, alarmMax){
  const n = num(v);
  if(n == null) return "st-muted";
  if(n > alarmMax) return "st-alarm";
  if(n > warnMax) return "st-warn";
  return "st-ok";
}

function clsState(value){
  const s = String(value || "").trim().toLowerCase();
  if(isFailure(value)) return "st-alarm";
  if(s.includes("перенаст") || s.includes("огранич")) return "st-warn";
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
  const p = ctx.sat?.subsystems?.afu?.params || {};
  const th = TH.afu;

  return {
    beamReady: isFailure(p["Готовность лучеобразования"]) ? "st-alarm" : "st-ok",
    beamCfg: clsState(p["Конфигурация лучей"]),
    pointErr: clsMoreBetter(p["Ошибка наведения луча, град"], th.BEAM_POINT_ALARM_DEG, th.BEAM_POINT_WARN_DEG),

    rx: clsState(p["Состояние приёмного тракта"]),
    tx: clsState(p["Состояние передающего тракта"]),
    sw: clsState(p["Состояние коммутаторов"]),
    filters: clsState(p["Состояние фильтров S/Ku/Ka"]),
    lna: clsState(p["Состояние МШУ"]),
    powerMeas: clsState(p["Тракт измерения мощности"]),

    vswr: clsLessBetter(p["КСВН"], th.VSWR_WARN, th.VSWR_ALARM),
    pwrDev: clsAbsLessBetter(p["Отклонение мощности, %"], th.POWER_DEV_WARN_PCT, th.POWER_DEV_ALARM_PCT),
    temp: clsLessBetter(p["Температура АФУ, °C"], th.TEMP_WARN_MAX_C, th.TEMP_ALARM_MAX_C),

    tm: isMissing(p["Телеметрия АФУ"]) ? "st-warn" : "st-ok",
    ack: isMissing(p["Квитанции команд АФУ"]) ? "st-warn" : "st-ok",
    brkLimit: String(p["Ограничение от БРК"] || "").toLowerCase() === "есть" ? "st-warn" : "st-ok",
    subaLimit: String(p["Ограничение от СУБА"] || "").toLowerCase() === "есть" ? "st-warn" : "st-ok",
  };
}

function egyptHeader(ctx, title){
  const { satNo, sat } = ctx;
  const sub = sat?.subsystems?.afu;
  const st = sat?.inactive ? "inactive" : (sub?.st || "warn");
  const p = sub?.params || {};
  const th = TH.afu;

  const ageMs = Date.now() - (sat?.lastUpdateMs || 0);
  const qualityOk = sat?.link === "ok" && ageMs <= th.AGE_ALARM_MS;
  const quality = qualityOk ? "достоверна" : "нет достоверной ТМИ";
  const qCls = qualityOk ? "st-ok" : "st-alarm";

  return `
    <div class="egy-top">
      <div class="egy-title mono">[КА "${escapeHtml(String(satNo))}"] АФУ ПН: ${escapeHtml(title)}</div>

      <div class="egy-line">
        <span class="badge ${badgeClass(st)}">${escapeHtml(stWord(st))}</span>
        <span class="chip ${qCls}">ТМИ: ${escapeHtml(quality)}</span>
        <span class="chip st-muted">ВО: <span class="mono">${escapeHtml(sat?.lastUpdate || "—")}</span></span>
        <span class="chip st-muted">Режим: <span class="mono">${escapeHtml(String(p["Режим АФУ"] || "—"))}</span></span>
        <span class="chip st-muted">Диапазон: <span class="mono">${escapeHtml(String(p["Диапазон АФУ"] || "—"))}</span></span>

        <span class="egy-sep"></span>

        <button class="btn-mini" data-open-sub="afu_current" data-open-title="АФУ ПН: Текущее состояние">Текущее состояние</button>
        <button class="btn-mini" data-open-sub="afu_control" data-open-title="АФУ ПН: Контроль состояния">Контроль состояния</button>
        <button class="btn-mini" data-open-sub="afu_beams" data-open-title="АФУ ПН: Лучи и тракты">Лучи и тракты</button>
      </div>
    </div>
  `;
}

export function renderDetailAFU(ctx){
  return renderAfuCurrent(ctx);
}

export function renderDetailAFU_Control(ctx){
  return renderAfuControl(ctx);
}

export function renderDetailAFU_Current(ctx){
  return renderAfuCurrent(ctx);
}

export function renderDetailAFU_Beams(ctx){
  return renderAfuBeams(ctx);
}

function renderAfuCurrent(ctx){
  const { sat } = ctx;
  const p = sat?.subsystems?.afu?.params || {};
  const c = classes(ctx);

  return `
    <div class="egyfmt">
      ${egyptHeader(ctx, "Текущее состояние")}

      <div class="egy-sheet">
        <table class="egy-table" cellspacing="0" cellpadding="0">
          <tr>
            <td class="egytd-top" colspan="8">Текущие параметры АФУ полезной нагрузки</td>
          </tr>

          <tr>
            <td class="egytd-sec" colspan="8">Режим, диапазон и лучевая конфигурация</td>
          </tr>
          <tr>
            ${lcell("Режим АФУ")}
            ${vcell(p["Режим АФУ"], "st-muted")}
            ${lcell("Диапазон АФУ")}
            ${vcell(p["Диапазон АФУ"], "st-muted")}
            ${lcell("Тип антенного модуля")}
            ${vcell(p["Тип антенного модуля"], "st-muted")}
            ${lcell("Активные лучи, шт")}
            ${vcell(p["Активные лучи, шт"], "st-muted")}
          </tr>
          <tr>
            ${lcell("Активный сектор")}
            ${vcell(p["Активный сектор"], "st-muted")}
            ${lcell("Готовность лучеобразования")}
            ${vcell(p["Готовность лучеобразования"], c.beamReady)}
            ${lcell("Ошибка наведения луча, град")}
            ${vcell(p["Ошибка наведения луча, град"], c.pointErr)}
            ${lcell("Конфигурация лучей")}
            ${vcell(p["Конфигурация лучей"], c.beamCfg)}
          </tr>

          <tr>
            <td class="egytd-sec" colspan="8">Антенные и фидерные тракты</td>
          </tr>
          <tr>
            ${lcell("Состояние приёмного тракта")}
            ${vcell(p["Состояние приёмного тракта"], c.rx)}
            ${lcell("Состояние передающего тракта")}
            ${vcell(p["Состояние передающего тракта"], c.tx)}
            ${lcell("Состояние коммутаторов")}
            ${vcell(p["Состояние коммутаторов"], c.sw)}
            ${lcell("Состояние фильтров S/Ku/Ka")}
            ${vcell(p["Состояние фильтров S/Ku/Ka"], c.filters)}
          </tr>
          <tr>
            ${lcell("Состояние МШУ")}
            ${vcell(p["Состояние МШУ"], c.lna)}
            ${lcell("Тракт измерения мощности")}
            ${vcell(p["Тракт измерения мощности"], c.powerMeas)}
            ${lcell("КСВН")}
            ${vcell(p["КСВН"], c.vswr)}
            ${lcell("Измеренная мощность, Вт")}
            ${vcell(p["Измеренная мощность, Вт"], "st-muted")}
          </tr>
          <tr>
            ${lcell("Отклонение мощности, %")}
            ${vcell(p["Отклонение мощности, %"], c.pwrDev)}
            ${lcell("Температура АФУ, °C")}
            ${vcell(p["Температура АФУ, °C"], c.temp)}
            ${lcell("Телеметрия АФУ")}
            ${vcell(p["Телеметрия АФУ"], c.tm)}
            ${lcell("Квитанции команд АФУ")}
            ${vcell(p["Квитанции команд АФУ"], c.ack)}
          </tr>

          <tr>
            <td class="egytd-sec" colspan="8">Ограничения от смежных подсистем</td>
          </tr>
          <tr>
            ${lcell("Ограничение от БРК")}
            ${vcell(p["Ограничение от БРК"], c.brkLimit)}
            ${lcell("Ограничение от СУБА")}
            ${vcell(p["Ограничение от СУБА"], c.subaLimit, `colspan="5"`)}
          </tr>
        </table>

        <div class="egy-footnote">
          <span class="mono">Назначение формата:</span> отображение текущего состояния АФУ как антенно-фидерной части полезной нагрузки связи: лучи, тракты S/Ku/Ka, МШУ, коммутаторы, фильтры и измерение мощности.
        </div>
      </div>
    </div>
  `;
}

function renderAfuControl(ctx){
  const { sat } = ctx;
  const sub = sat?.subsystems?.afu;
  const p = sub?.params || {};
  const th = TH.afu;
  const c = classes(ctx);

  const st = sat?.inactive ? "inactive" : (sub?.st || "warn");
  const msg = sub?.msg || "—";
  const ageMs = Date.now() - (sat?.lastUpdateMs || 0);
  const tmiCls = sat?.link === "ok" && ageMs <= th.AGE_ALARM_MS ? "st-ok" : "st-alarm";

  const actionOverall =
    st === "ok" ? "штатный контроль" :
    st === "warn" ? "проверить лучевую конфигурацию, КСВН, мощность и ограничения от БРК/СУБА" :
    st === "alarm" ? "ограничить передачу, проверить АФУ, БРК, СУБА и тракт измерения мощности" :
    "ожидать ввода КА в эксплуатацию";

  const rxTxCls = c.rx === "st-alarm" || c.tx === "st-alarm" ? "st-alarm" : "st-ok";
  const swFilterCls = c.sw === "st-alarm" || c.filters === "st-alarm" ? "st-alarm" : c.sw === "st-warn" || c.filters === "st-warn" ? "st-warn" : "st-ok";
  const limitCls = c.brkLimit === "st-warn" || c.subaLimit === "st-warn" ? "st-warn" : "st-ok";

  const rows = [
    checkRow(
      "Качество ТМИ АФУ",
      tmiCls === "st-ok" ? "достоверна" : "нет достоверной ТМИ",
      `данные актуальны, возраст ТМИ ≤ ${th.AGE_ALARM_MS} мс`,
      tmiCls,
      tmiCls === "st-ok" ? "данные пригодны для контроля" : "данные нельзя использовать как достоверные",
      tmiCls === "st-ok" ? "продолжить контроль" : "проверить канал ТМ/КИ"
    ),
    checkRow(
      "Готовность лучеобразования",
      p["Готовность лучеобразования"],
      "в рабочем режиме лучеобразование должно быть готово",
      c.beamReady,
      c.beamReady === "st-ok" ? "лучеобразование готово" : "готовность лучеобразования нарушена",
      c.beamReady === "st-ok" ? "действий не требуется" : "ограничить режим связи и повторить конфигурацию АФУ"
    ),
    checkRow(
      "Ошибка наведения луча",
      `${safe(p["Ошибка наведения луча, град"])} град`,
      `норма ≤${th.BEAM_POINT_WARN_DEG}; предупреждение ${th.BEAM_POINT_WARN_DEG}…${th.BEAM_POINT_ALARM_DEG}; авария >${th.BEAM_POINT_ALARM_DEG}`,
      c.pointErr,
      c.pointErr === "st-ok" ? "луч удерживается в допустимом направлении" : c.pointErr === "st-warn" ? "ошибка наведения растёт" : "ошибка наведения недопустима",
      c.pointErr === "st-ok" ? "действий не требуется" : "проверить конфигурацию лучей и состояние БРК/СУБА"
    ),
    checkRow(
      "Приёмный и передающий тракты",
      `приём: ${safe(p["Состояние приёмного тракта"])}; передача: ${safe(p["Состояние передающего тракта"])}`,
      "оба тракта должны быть в состоянии нормы в рабочем режиме связи",
      rxTxCls,
      rxTxCls === "st-ok" ? "приёмный и передающий тракты исправны" : "нарушен приёмный или передающий тракт",
      rxTxCls === "st-ok" ? "действий не требуется" : "ограничить БРК и проверить тракт АФУ"
    ),
    checkRow(
      "Коммутаторы и фильтры S/Ku/Ka",
      `коммутаторы: ${safe(p["Состояние коммутаторов"])}; фильтры: ${safe(p["Состояние фильтров S/Ku/Ka"])}`,
      "коммутаторы и фильтры должны быть в штатной конфигурации",
      swFilterCls,
      swFilterCls === "st-ok" ? "конфигурация штатная" : swFilterCls === "st-warn" ? "идёт перенастройка или ограничение" : "отказ коммутации или фильтрации",
      swFilterCls === "st-ok" ? "действий не требуется" : "повторить конфигурацию через СУБА, проверить БРК"
    ),
    checkRow(
      "Состояние МШУ",
      p["Состояние МШУ"],
      "МШУ должен быть в норме для приёмного тракта",
      c.lna,
      c.lna === "st-ok" ? "МШУ исправен" : "отказ или нарушение работы МШУ",
      c.lna === "st-ok" ? "действий не требуется" : "ограничить приёмный канал и проверить АФУ"
    ),
    checkRow(
      "КСВН",
      p["КСВН"],
      `норма ≤${th.VSWR_WARN}; предупреждение ${th.VSWR_WARN}…${th.VSWR_ALARM}; авария >${th.VSWR_ALARM}`,
      c.vswr,
      c.vswr === "st-ok" ? "согласование тракта допустимо" : c.vswr === "st-warn" ? "согласование тракта ухудшилось" : "КСВН недопустим",
      c.vswr === "st-ok" ? "действий не требуется" : "ограничить передачу, проверить фидерный тракт"
    ),
    checkRow(
      "Измерение мощности",
      `мощность: ${safe(p["Измеренная мощность, Вт"])} Вт; отклонение: ${safe(p["Отклонение мощности, %"])} %`,
      `предупреждение |ΔP|>${th.POWER_DEV_WARN_PCT}%; авария |ΔP|>${th.POWER_DEV_ALARM_PCT}%`,
      c.pwrDev,
      c.pwrDev === "st-ok" ? "мощность соответствует ожидаемому уровню" : c.pwrDev === "st-warn" ? "зафиксировано отклонение мощности" : "отклонение мощности недопустимо",
      c.pwrDev === "st-ok" ? "действий не требуется" : "проверить передающий тракт и тракт измерения мощности"
    ),
    checkRow(
      "Температура АФУ",
      `${safe(p["Температура АФУ, °C"])} °C`,
      `норма ≤${th.TEMP_WARN_MAX_C} °C; предупреждение ${th.TEMP_WARN_MAX_C}…${th.TEMP_ALARM_MAX_C} °C; авария >${th.TEMP_ALARM_MAX_C} °C`,
      c.temp,
      c.temp === "st-ok" ? "температура допустима" : c.temp === "st-warn" ? "температура повышена" : "перегрев АФУ",
      c.temp === "st-ok" ? "действий не требуется" : "проверить СОТР и ограничить режимы передачи"
    ),
    checkRow(
      "Ограничения от БРК/СУБА",
      `БРК: ${safe(p["Ограничение от БРК"])}; СУБА: ${safe(p["Ограничение от СУБА"])}`,
      "при деградации БРК или СУБА режим АФУ должен ограничиваться",
      limitCls,
      limitCls === "st-ok" ? "смежные ограничения отсутствуют" : "есть ограничение от смежной системы",
      limitCls === "st-ok" ? "действий не требуется" : "согласовать режим АФУ с БРК/СУБА"
    )
  ].join("");

  return `
    <div class="egyfmt">
      ${egyptHeader(ctx, "Контроль состояния")}

      <div class="egy-sheet">
        <table class="egy-table" cellspacing="0" cellpadding="0">
          <tr>
            <td class="egytd-top" colspan="6">Итоговая оценка состояния АФУ ПН</td>
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
          <span class="mono">Назначение формата:</span> объяснить состояние АФУ ПН как антенно-фидерной части КА связи, связанной с БРК и СУБА.
        </div>
      </div>
    </div>
  `;
}

function renderAfuBeams(ctx){
  const { sat } = ctx;
  const p = sat?.subsystems?.afu?.params || {};
  const th = TH.afu;
  const c = classes(ctx);

  return `
    <div class="egyfmt">
      ${egyptHeader(ctx, "Лучи и тракты")}

      <div class="egy-grid">
        <div class="egy-box">
          <div class="egy-box-h">Лучевая конфигурация</div>
          ${cell("Тип антенного модуля", p["Тип антенного модуль"] || p["Тип антенного модуля"], "st-muted")}
          ${cell("Активные лучи, шт", p["Активные лучи, шт"], "st-muted")}
          ${cell("Активный сектор", p["Активный сектор"], "st-muted")}
          ${cell("Готовность лучеобразования", p["Готовность лучеобразования"], c.beamReady)}
          ${cell("Ошибка наведения луча, град", p["Ошибка наведения луча, град"], c.pointErr)}
          ${cell("Конфигурация лучей", p["Конфигурация лучей"], c.beamCfg)}
        </div>

        <div class="egy-box">
          <div class="egy-box-h">Тракты S/Ku/Ka</div>
          ${cell("Состояние приёмного тракта", p["Состояние приёмного тракта"], c.rx)}
          ${cell("Состояние передающего тракта", p["Состояние передающего тракта"], c.tx)}
          ${cell("Состояние коммутаторов", p["Состояние коммутаторов"], c.sw)}
          ${cell("Состояние фильтров S/Ku/Ka", p["Состояние фильтров S/Ku/Ka"], c.filters)}
          ${cell("Состояние МШУ", p["Состояние МШУ"], c.lna)}
        </div>

        <div class="egy-box">
          <div class="egy-box-h">Контроль мощности и согласования</div>
          ${cell("КСВН", p["КСВН"], c.vswr)}
          ${cell("Измеренная мощность, Вт", p["Измеренная мощность, Вт"], "st-muted")}
          ${cell("Отклонение мощности, %", p["Отклонение мощности, %"], c.pwrDev)}
          ${cell("Тракт измерения мощности", p["Тракт измерения мощности"], c.powerMeas)}
          ${cell("Температура АФУ, °C", p["Температура АФУ, °C"], c.temp)}
        </div>

        <div class="egy-box" style="grid-column:1 / -1;">
          <div class="egy-box-h">Критерии контроля АФУ</div>
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
              ${rowCrit("Ошибка наведения луча, град", p["Ошибка наведения луча, град"], `≤ ${th.BEAM_POINT_WARN_DEG}`, `${th.BEAM_POINT_WARN_DEG}…${th.BEAM_POINT_ALARM_DEG}`, `> ${th.BEAM_POINT_ALARM_DEG}`)}
              ${rowCrit("КСВН", p["КСВН"], `≤ ${th.VSWR_WARN}`, `${th.VSWR_WARN}…${th.VSWR_ALARM}`, `> ${th.VSWR_ALARM}`)}
              ${rowCrit("Отклонение мощности, %", p["Отклонение мощности, %"], `|ΔP| ≤ ${th.POWER_DEV_WARN_PCT}`, `${th.POWER_DEV_WARN_PCT}…${th.POWER_DEV_ALARM_PCT}`, `> ${th.POWER_DEV_ALARM_PCT}`)}
              ${rowCrit("Температура АФУ, °C", p["Температура АФУ, °C"], `≤ ${th.TEMP_WARN_MAX_C}`, `${th.TEMP_WARN_MAX_C}…${th.TEMP_ALARM_MAX_C}`, `> ${th.TEMP_ALARM_MAX_C}`)}
              ${rowCrit("Состояние МШУ", p["Состояние МШУ"], "норма", "—", "отказ")}
              ${rowCrit("Коммутаторы и фильтры", `${safe(p["Состояние коммутаторов"])} / ${safe(p["Состояние фильтров S/Ku/Ka"])}`, "штатно", "перенастройка", "отказ")}
            </tbody>
          </table>
        </div>

        <div class="egy-box" style="grid-column:1 / -1;">
          <div class="egy-note">
            <div class="egy-note-row"><b>Норма:</b> лучеобразование готово, тракты S/Ku/Ka штатны, КСВН и мощность в допустимых пределах.</div>
            <div class="egy-note-row"><b>Предупреждение:</b> растёт ошибка наведения луча, КСВН, отклонение мощности или температура; возможна перенастройка лучей.</div>
            <div class="egy-note-row"><b>Авария:</b> отказ МШУ, коммутаторов, фильтров, приёмного/передающего тракта либо недопустимый КСВН.</div>
          </div>
        </div>
      </div>
    </div>
  `;
}
