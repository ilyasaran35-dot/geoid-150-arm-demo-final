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

function isBad(value){
  const s = String(value || "").trim().toLowerCase();
  return (
    s === "ошибка" ||
    s === "нарушена" ||
    s === "нарушен" ||
    s === "потеряна" ||
    s === "отказ" ||
    s === "сработала" ||
    s === "да" ||
    s === "запрещено"
  );
}

function isMissing(value){
  const s = String(value || "").trim().toLowerCase();
  return s === "нет" || isBad(value);
}

function clsMoreBetter(v, alarmMin, okMin){
  const n = num(v);
  if(n == null) return "st-muted";
  if(n < alarmMin) return "st-alarm";
  if(n < okMin) return "st-warn";
  return "st-ok";
}

function clsLessBetter(v, warnMax, alarmMax){
  const n = num(v);
  if(n == null) return "st-muted";
  if(n > alarmMax) return "st-alarm";
  if(n > warnMax) return "st-warn";
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
  const p = ctx.sat?.subsystems?.brk?.params || {};
  const th = TH.brk;

  return {
    modem: isBad(p["Состояние модема"]) ? "st-alarm" : "st-ok",
    rx: isBad(p["Состояние приёма"]) ? "st-alarm" : "st-ok",
    tx: isBad(p["Состояние передачи"]) ? "st-alarm" : "st-ok",

    linkMargin: clsMoreBetter(p["Запас радиолинии, дБ"], th.LINK_MARGIN_ALARM_MIN_DB, th.LINK_MARGIN_OK_MIN_DB),
    bitError: clsLessBetter(p["Вероятность битовой ошибки"], th.BIT_ERROR_WARN, th.BIT_ERROR_ALARM),
    loss: clsLessBetter(p["Потери пакетов, %"], th.PACKET_LOSS_WARN_PCT, th.PACKET_LOSS_ALARM_PCT),
    exchangeErr: clsLessBetter(p["Ошибки пользовательского обмена, шт"], th.USER_EXCHANGE_ERR_WARN_MAX, th.USER_EXCHANGE_ERR_ALARM_MAX),
    load: clsLessBetter(p["Загрузка БРК, %"], th.LOAD_WARN_MAX_PCT, th.LOAD_ALARM_MAX_PCT),
    temp: clsLessBetter(p["Температура БРК, °C"], th.TEMP_WARN_MAX_C, th.TEMP_ALARM_MAX_C),

    pa: isBad(p["Авария усилителя мощности"]) ? "st-alarm" : "st-ok",
    tm: isMissing(p["Телеметрия ПН"]) ? "st-warn" : "st-ok",
    ack: isMissing(p["Квитанции команд БРК"]) ? "st-warn" : "st-ok",
    epsLimit: String(p["Ограничение от СЭС"] || "").toLowerCase() === "есть" ? "st-warn" : "st-ok",
    subaLimit: String(p["Ограничение от СУБА"] || "").toLowerCase() === "есть" ? "st-warn" : "st-ok",
  };
}

function egyptHeader(ctx, title){
  const { satNo, sat } = ctx;
  const sub = sat?.subsystems?.brk;
  const st = sat?.inactive ? "inactive" : (sub?.st || "warn");
  const p = sub?.params || {};

  const ageMs = Date.now() - (sat?.lastUpdateMs || 0);
  const qualityOk = sat?.link === "ok" && ageMs <= 8000;
  const quality = qualityOk ? "достоверна" : "нет достоверной ТМИ";
  const qCls = qualityOk ? "st-ok" : "st-alarm";

  return `
    <div class="egy-top">
      <div class="egy-title mono">[КА "${escapeHtml(String(satNo))}"] БРК Ku/Ka: ${escapeHtml(title)}</div>

      <div class="egy-line">
        <span class="badge ${badgeClass(st)}">${escapeHtml(stWord(st))}</span>
        <span class="chip ${qCls}">ТМИ: ${escapeHtml(quality)}</span>
        <span class="chip st-muted">ВО: <span class="mono">${escapeHtml(sat?.lastUpdate || "—")}</span></span>
        <span class="chip st-muted">Режим: <span class="mono">${escapeHtml(String(p["Режим БРК"] || "—"))}</span></span>
        <span class="chip st-muted">Диапазон: <span class="mono">${escapeHtml(String(p["Диапазон БРК"] || "—"))}</span></span>

        <span class="egy-sep"></span>

        <button class="btn-mini" data-open-sub="brk_current" data-open-title="БРК Ku/Ka: Текущее состояние">Текущее состояние</button>
        <button class="btn-mini" data-open-sub="brk_control" data-open-title="БРК Ku/Ka: Контроль состояния">Контроль состояния</button>
        <button class="btn-mini" data-open-sub="brk_link" data-open-title="БРК Ku/Ka: Каналы и лучи">Каналы и лучи</button>
      </div>
    </div>
  `;
}

export function renderDetailBRK(ctx){
  return renderBrkCurrent(ctx);
}

export function renderDetailBRK_Control(ctx){
  return renderBrkControl(ctx);
}

export function renderDetailBRK_Current(ctx){
  return renderBrkCurrent(ctx);
}

export function renderDetailBRK_Link(ctx){
  return renderBrkLink(ctx);
}

function renderBrkCurrent(ctx){
  const { sat } = ctx;
  const p = sat?.subsystems?.brk?.params || {};
  const th = TH.brk;
  const c = classes(ctx);

  return `
    <div class="egyfmt">
      ${egyptHeader(ctx, "Текущее состояние")}

      <div class="egy-sheet">
        <table class="egy-table" cellspacing="0" cellpadding="0">
          <tr>
            <td class="egytd-top" colspan="8">Текущие параметры БРК Ku/Ka</td>
          </tr>

          <tr>
            <td class="egytd-sec" colspan="8">Режим и пользовательский канал</td>
          </tr>
          <tr>
            ${lcell("Режим БРК")}
            ${vcell(p["Режим БРК"], "st-muted")}
            ${lcell("Диапазон БРК")}
            ${vcell(p["Диапазон БРК"], "st-muted")}
            ${lcell("Состояние модема")}
            ${vcell(p["Состояние модема"], c.modem)}
            ${lcell("Телеметрия ПН")}
            ${vcell(p["Телеметрия ПН"], c.tm)}
          </tr>

          <tr>
            <td class="egytd-sec" colspan="8">Каналы и лучи</td>
          </tr>
          <tr>
            ${lcell("Состояние приёма")}
            ${vcell(p["Состояние приёма"], c.rx)}
            ${lcell("Состояние передачи")}
            ${vcell(p["Состояние передачи"], c.tx)}
            ${lcell("Активные лучи, шт")}
            ${vcell(p["Активные лучи, шт"], "st-muted")}
            ${lcell("Скорость на луч, Мбит/с")}
            ${vcell(p["Скорость на луч, Мбит/с"], "st-muted")}
          </tr>
          <tr>
            ${lcell("Суммарная скорость, Мбит/с")}
            ${vcell(p["Суммарная скорость, Мбит/с"], "st-muted")}
            ${lcell("Целевая скорость на луч")}
            ${vcell(`до ${th.RATE_PER_BEAM_TARGET_MBPS} Мбит/с`, "st-muted")}
            ${lcell("Загрузка БРК, %")}
            ${vcell(p["Загрузка БРК, %"], c.load)}
            ${lcell("Квитанции команд БРК")}
            ${vcell(p["Квитанции команд БРК"], c.ack)}
          </tr>

          <tr>
            <td class="egytd-sec" colspan="8">Качество пользовательского обмена</td>
          </tr>
          <tr>
            ${lcell("Запас радиолинии, дБ")}
            ${vcell(p["Запас радиолинии, дБ"], c.linkMargin)}
            ${lcell("Вероятность битовой ошибки")}
            ${vcell(p["Вероятность битовой ошибки"], c.bitError)}
            ${lcell("Потери пакетов, %")}
            ${vcell(p["Потери пакетов, %"], c.loss)}
            ${lcell("Ошибки пользовательского обмена, шт")}
            ${vcell(p["Ошибки пользовательского обмена, шт"], c.exchangeErr)}
          </tr>

          <tr>
            <td class="egytd-sec" colspan="8">Аппаратура БРК и ограничения</td>
          </tr>
          <tr>
            ${lcell("Выходная мощность передатчика, Вт")}
            ${vcell(p["Выходная мощность передатчика, Вт"], "st-muted")}
            ${lcell("Температура БРК, °C")}
            ${vcell(p["Температура БРК, °C"], c.temp)}
            ${lcell("Авария усилителя мощности")}
            ${vcell(p["Авария усилителя мощности"], c.pa)}
            ${lcell("Ограничение от СЭС")}
            ${vcell(p["Ограничение от СЭС"], c.epsLimit)}
          </tr>
          <tr>
            ${lcell("Ограничение от СУБА")}
            ${vcell(p["Ограничение от СУБА"], c.subaLimit, `colspan="7"`)}
          </tr>
        </table>

        <div class="egy-footnote">
          <span class="mono">Назначение формата:</span> отображение текущих значений БРК как целевой аппаратуры связи: режим, лучи, скорость, качество пользовательского обмена и ограничения от СЭС/СУБА.
        </div>
      </div>
    </div>
  `;
}

function renderBrkControl(ctx){
  const { sat } = ctx;
  const sub = sat?.subsystems?.brk;
  const p = sub?.params || {};
  const th = TH.brk;
  const c = classes(ctx);

  const st = sat?.inactive ? "inactive" : (sub?.st || "warn");
  const msg = sub?.msg || "—";

  const ageMs = Date.now() - (sat?.lastUpdateMs || 0);
  const tmiCls = sat?.link === "ok" && ageMs <= 8000 ? "st-ok" : "st-alarm";

  const actionOverall =
    st === "ok" ? "штатный контроль" :
    st === "warn" ? "проверить качество пользовательского канала, ограничения от СЭС/СУБА и загрузку БРК" :
    st === "alarm" ? "ограничить пользовательский трафик, проверить БРК, СУБА, АФУ и энергопитание" :
    "ожидать ввода КА в эксплуатацию";

  const rows = [
    checkRow(
      "Качество ТМИ БРК",
      tmiCls === "st-ok" ? "достоверна" : "нет достоверной ТМИ",
      "данные актуальны, связь с КА есть",
      tmiCls,
      tmiCls === "st-ok" ? "данные пригодны для контроля" : "данные нельзя использовать как достоверные",
      tmiCls === "st-ok" ? "продолжить контроль" : "проверить канал ТМ/КИ"
    ),
    checkRow(
      "Синхронизация модема",
      p["Состояние модема"],
      "в рабочем режиме должна быть установлена синхронизация",
      c.modem,
      c.modem === "st-ok" ? "синхронизация установлена" : "синхронизация потеряна",
      c.modem === "st-ok" ? "действий не требуется" : "ограничить трафик и повторить настройку БРК"
    ),
    checkRow(
      "Состояние приёма/передачи",
      `приём: ${safe(p["Состояние приёма"])}; передача: ${safe(p["Состояние передачи"])}`,
      "приём и передача должны быть активны в рабочем режиме связи",
      c.rx === "st-ok" && c.tx === "st-ok" ? "st-ok" : "st-alarm",
      c.rx === "st-ok" && c.tx === "st-ok" ? "каналы активны" : "нарушен приём или передача",
      c.rx === "st-ok" && c.tx === "st-ok" ? "действий не требуется" : "проверить БРК, АФУ и команды СУБА"
    ),
    checkRow(
      "Запас радиолинии",
      `${safe(p["Запас радиолинии, дБ"])} дБ`,
      `норма ≥${th.LINK_MARGIN_OK_MIN_DB} дБ; предупреждение ${th.LINK_MARGIN_ALARM_MIN_DB}…${th.LINK_MARGIN_OK_MIN_DB} дБ; авария <${th.LINK_MARGIN_ALARM_MIN_DB} дБ`,
      c.linkMargin,
      c.linkMargin === "st-ok" ? "запас радиолинии достаточен" : c.linkMargin === "st-warn" ? "запас радиолинии снижен" : "запас радиолинии недостаточен",
      c.linkMargin === "st-ok" ? "действий не требуется" : "проверить АФУ, диаграмму направленности и режим БРК"
    ),
    checkRow(
      "Вероятность битовой ошибки",
      p["Вероятность битовой ошибки"],
      `норма ≤${th.BIT_ERROR_WARN}; предупреждение ${th.BIT_ERROR_WARN}…${th.BIT_ERROR_ALARM}; авария >${th.BIT_ERROR_ALARM}`,
      c.bitError,
      c.bitError === "st-ok" ? "качество передачи допустимо" : c.bitError === "st-warn" ? "рост битовых ошибок" : "битовые ошибки превышают аварийный порог",
      c.bitError === "st-ok" ? "действий не требуется" : "ограничить скорость или проверить радиолинию"
    ),
    checkRow(
      "Потери пакетов",
      `${safe(p["Потери пакетов, %"])} %`,
      `норма ≤${th.PACKET_LOSS_WARN_PCT}%; предупреждение ${th.PACKET_LOSS_WARN_PCT}…${th.PACKET_LOSS_ALARM_PCT}%; авария >${th.PACKET_LOSS_ALARM_PCT}%`,
      c.loss,
      c.loss === "st-ok" ? "потери пользовательского обмена малы" : c.loss === "st-warn" ? "рост потерь пакетов" : "потери пакетов превышают аварийный порог",
      c.loss === "st-ok" ? "действий не требуется" : "проверить качество канала и режимы лучей"
    ),
    checkRow(
      "Загрузка БРК",
      `${safe(p["Загрузка БРК, %"])} %`,
      `норма ≤${th.LOAD_WARN_MAX_PCT}%; предупреждение ${th.LOAD_WARN_MAX_PCT}…${th.LOAD_ALARM_MAX_PCT}%; авария >${th.LOAD_ALARM_MAX_PCT}%`,
      c.load,
      c.load === "st-ok" ? "загрузка допустима" : c.load === "st-warn" ? "повышенная загрузка БРК" : "перегрузка БРК",
      c.load === "st-ok" ? "действий не требуется" : "перераспределить ресурс или ограничить число активных лучей"
    ),
    checkRow(
      "Температура БРК",
      `${safe(p["Температура БРК, °C"])} °C`,
      `норма ≤${th.TEMP_WARN_MAX_C} °C; предупреждение ${th.TEMP_WARN_MAX_C}…${th.TEMP_ALARM_MAX_C} °C; авария >${th.TEMP_ALARM_MAX_C} °C`,
      c.temp,
      c.temp === "st-ok" ? "температура допустима" : c.temp === "st-warn" ? "температура повышена" : "перегрев БРК",
      c.temp === "st-ok" ? "действий не требуется" : "проверить СОТР и ограничить режимы БРК"
    ),
    checkRow(
      "Усилитель мощности",
      p["Авария усилителя мощности"],
      "срабатывание аварийного признака усилителя = авария",
      c.pa,
      c.pa === "st-ok" ? "авария усилителя не зафиксирована" : "зафиксирована авария усилителя мощности",
      c.pa === "st-ok" ? "действий не требуется" : "запретить передачу до анализа ТМИ"
    ),
    checkRow(
      "Ограничения от СЭС/СУБА",
      `СЭС: ${safe(p["Ограничение от СЭС"])}; СУБА: ${safe(p["Ограничение от СУБА"])}`,
      "при деградации СЭС/СУБА БРК должен ограничивать нагрузку и режимы",
      c.epsLimit === "st-ok" && c.subaLimit === "st-ok" ? "st-ok" : "st-warn",
      c.epsLimit === "st-ok" && c.subaLimit === "st-ok" ? "смежные ограничения отсутствуют" : "есть ограничение от смежной системы",
      c.epsLimit === "st-ok" && c.subaLimit === "st-ok" ? "действий не требуется" : "согласовать режим БРК с СЭС/СУБА"
    )
  ].join("");

  return `
    <div class="egyfmt">
      ${egyptHeader(ctx, "Контроль состояния")}

      <div class="egy-sheet">
        <table class="egy-table" cellspacing="0" cellpadding="0">
          <tr>
            <td class="egytd-top" colspan="6">Итоговая оценка состояния БРК Ku/Ka</td>
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
          <span class="mono">Назначение формата:</span> объяснить состояние БРК как целевой аппаратуры связи, а не как аппаратуры ДЗЗ.
        </div>
      </div>
    </div>
  `;
}

function renderBrkLink(ctx){
  const { sat } = ctx;
  const p = sat?.subsystems?.brk?.params || {};
  const th = TH.brk;
  const c = classes(ctx);

  return `
    <div class="egyfmt">
      ${egyptHeader(ctx, "Каналы и лучи")}

      <div class="egy-grid">
        <div class="egy-box">
          <div class="egy-box-h">Лучевая конфигурация</div>
          ${cell("Диапазон БРК", p["Диапазон БРК"], "st-muted")}
          ${cell("Активные лучи, шт", p["Активные лучи, шт"], "st-muted")}
          ${cell("Скорость на луч, Мбит/с", p["Скорость на луч, Мбит/с"], "st-muted")}
          ${cell("Целевая скорость на луч", `до ${th.RATE_PER_BEAM_TARGET_MBPS} Мбит/с`, "st-muted")}
          ${cell("Суммарная скорость, Мбит/с", p["Суммарная скорость, Мбит/с"], "st-muted")}
        </div>

        <div class="egy-box">
          <div class="egy-box-h">Качество пользовательского обмена</div>
          ${cell("Запас радиолинии, дБ", p["Запас радиолинии, дБ"], c.linkMargin)}
          ${cell("Вероятность битовой ошибки", p["Вероятность битовой ошибки"], c.bitError)}
          ${cell("Потери пакетов, %", p["Потери пакетов, %"], c.loss)}
          ${cell("Ошибки пользовательского обмена, шт", p["Ошибки пользовательского обмена, шт"], c.exchangeErr)}
        </div>

        <div class="egy-box">
          <div class="egy-box-h">Ограничения режима</div>
          ${cell("Ограничение от СЭС", p["Ограничение от СЭС"], c.epsLimit)}
          ${cell("Ограничение от СУБА", p["Ограничение от СУБА"], c.subaLimit)}
          ${cell("Загрузка БРК, %", p["Загрузка БРК, %"], c.load)}
          ${cell("Температура БРК, °C", p["Температура БРК, °C"], c.temp)}
        </div>

        <div class="egy-box" style="grid-column:1 / -1;">
          <div class="egy-box-h">Критерии контроля БРК</div>
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
              ${rowCrit("Запас радиолинии, дБ", p["Запас радиолинии, дБ"], `≥ ${th.LINK_MARGIN_OK_MIN_DB}`, `${th.LINK_MARGIN_ALARM_MIN_DB}…${th.LINK_MARGIN_OK_MIN_DB}`, `< ${th.LINK_MARGIN_ALARM_MIN_DB}`)}
              ${rowCrit("Вероятность битовой ошибки", p["Вероятность битовой ошибки"], `≤ ${th.BIT_ERROR_WARN}`, `${th.BIT_ERROR_WARN}…${th.BIT_ERROR_ALARM}`, `> ${th.BIT_ERROR_ALARM}`)}
              ${rowCrit("Потери пакетов, %", p["Потери пакетов, %"], `≤ ${th.PACKET_LOSS_WARN_PCT}`, `${th.PACKET_LOSS_WARN_PCT}…${th.PACKET_LOSS_ALARM_PCT}`, `> ${th.PACKET_LOSS_ALARM_PCT}`)}
              ${rowCrit("Ошибки пользовательского обмена, шт", p["Ошибки пользовательского обмена, шт"], `≤ ${th.USER_EXCHANGE_ERR_WARN_MAX}`, `${th.USER_EXCHANGE_ERR_WARN_MAX}…${th.USER_EXCHANGE_ERR_ALARM_MAX}`, `> ${th.USER_EXCHANGE_ERR_ALARM_MAX}`)}
              ${rowCrit("Загрузка БРК, %", p["Загрузка БРК, %"], `≤ ${th.LOAD_WARN_MAX_PCT}`, `${th.LOAD_WARN_MAX_PCT}…${th.LOAD_ALARM_MAX_PCT}`, `> ${th.LOAD_ALARM_MAX_PCT}`)}
              ${rowCrit("Температура БРК, °C", p["Температура БРК, °C"], `≤ ${th.TEMP_WARN_MAX_C}`, `${th.TEMP_WARN_MAX_C}…${th.TEMP_ALARM_MAX_C}`, `> ${th.TEMP_ALARM_MAX_C}`)}
            </tbody>
          </table>
        </div>

        <div class="egy-box" style="grid-column:1 / -1;">
          <div class="egy-note">
            <div class="egy-note-row"><b>Норма:</b> БРК работает в Ku/Ka-диапазонах, модем синхронизирован, приём/передача активны, параметры пользовательского обмена в допустимых пределах.</div>
            <div class="egy-note-row"><b>Предупреждение:</b> снижается запас радиолинии, растёт вероятность ошибки, потери пакетов, загрузка или температура БРК.</div>
            <div class="egy-note-row"><b>Авария:</b> потеря синхронизации модема, отказ усилителя мощности, недопустимое качество пользовательского канала или перегрев БРК.</div>
          </div>
        </div>
      </div>
    </div>
  `;
}