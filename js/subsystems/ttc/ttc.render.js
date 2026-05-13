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

function clsLessBetter(v, warnMin, okMin){
  const n = num(v);
  if(n == null) return "st-muted";
  if(n < warnMin) return "st-alarm";
  if(n < okMin) return "st-warn";
  return "st-ok";
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
  return s === "нет" || s === "ошибка" || s === "нарушен" || s === "разомкнут" || s === "запрещён";
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
  const sub = sat?.subsystems?.ttc;
  const st = sat?.inactive ? "inactive" : (sub?.st || "warn");
  const p = sub?.params || {};
  const th = TH.ttc;

  const ageMs = Date.now() - (sat?.lastUpdateMs || 0);
  const qualityOk = (sat?.link === "ok" && ageMs <= th.AGE_ALARM_MS);
  const quality = qualityOk ? "достоверна" : "нет достоверной ТМИ";
  const qCls = qualityOk ? "st-ok" : "st-alarm";

  const mode = p["Режим ССКУ"] || "—";
  const channel = p["Состояние канала ТМ/КИ"] || "—";
  const chCls = isBad(channel) ? "st-alarm" : "st-ok";

  return `
    <div class="egy-top">
      <div class="egy-title mono">[КА "${escapeHtml(String(satNo))}"] ССКУ: ${escapeHtml(title)}</div>

      <div class="egy-line">
        <span class="badge ${badgeClass(st)}">${escapeHtml(stWord(st))}</span>
        <span class="chip ${qCls}">ТМИ: ${escapeHtml(quality)}</span>
        <span class="chip st-muted">ВО: <span class="mono">${escapeHtml(sat?.lastUpdate || "—")}</span></span>
        <span class="chip ${chCls}">Канал ТМ/КИ: <span class="mono">${escapeHtml(String(channel))}</span></span>
        <span class="chip st-muted">Режим: <span class="mono">${escapeHtml(String(mode))}</span></span>

        <span class="egy-sep"></span>

        <button class="btn-mini" data-open-sub="ttc_current" data-open-title="ССКУ: Текущее состояние">Текущее состояние</button>
        <button class="btn-mini" data-open-sub="ttc_control" data-open-title="ССКУ: Контроль состояния">Контроль состояния</button>
        <button class="btn-mini" data-open-sub="ttc_link" data-open-title="ССКУ: Канал и обмен">Канал и обмен</button>
      </div>
    </div>
  `;
}

export function renderDetailTTC(ctx){
  return renderTtcCurrent(ctx);
}

export function renderDetailTTC_Control(ctx){
  return renderTtcControl(ctx);
}

export function renderDetailTTC_Current(ctx){
  return renderTtcCurrent(ctx);
}

export function renderDetailTTC_Link(ctx){
  return renderTtcLink(ctx);
}

function classes(ctx){
  const p = ctx.sat?.subsystems?.ttc?.params || {};
  const th = TH.ttc;

  return {
    signal: clsLessBetter(p["Уровень принимаемого сигнала, дБм"], th.SIGNAL_WARN_MIN_DBM, th.SIGNAL_OK_MIN_DBM),
    integrity: clsByMax(p["Ошибки контроля целостности, шт"], th.INTEGRITY_WARN_MAX, th.INTEGRITY_ALARM_MAX),
    wait: clsByMax(p["Превышения времени ожидания, шт"], th.WAIT_WARN_MAX, th.WAIT_ALARM_MAX),
    retry: clsByMax(p["Повторы передачи, шт"], th.RETRY_WARN_MAX, th.RETRY_ALARM_MAX),
    sync: isBad(p["Синхронизация времени"]) ? "st-alarm" : "st-ok",
    channel: isBad(p["Состояние канала ТМ/КИ"]) ? "st-alarm" : "st-ok",
    cmd: isBad(p["Приём командной информации"]) ? "st-warn" : "st-ok",
    tm: isBad(p["Передача ТМИ"]) ? "st-alarm" : "st-ok",
    ack: isBad(p["Квитанции команд"]) ? "st-warn" : "st-ok",
  };
}

function renderTtcCurrent(ctx){
  const { sat } = ctx;
  const sub = sat?.subsystems?.ttc;
  const p = sub?.params || {};
  const th = TH.ttc;
  const c = classes(ctx);

  const ageMs = Date.now() - (sat?.lastUpdateMs || 0);
  const ageCls = ageMs > th.AGE_ALARM_MS ? "st-alarm" : "st-ok";

  return `
    <div class="egyfmt">
      ${egyptHeader(ctx, "Текущее состояние")}

      <div class="egy-sheet">
        <table class="egy-table" cellspacing="0" cellpadding="0">
          <tr>
            <td class="egytd-top" colspan="8">Текущие параметры ССКУ</td>
          </tr>

          <tr>
            <td class="egytd-sec" colspan="8">Режим и состояние служебного канала</td>
          </tr>
          <tr>
            ${lcell("Режим ССКУ")}
            ${vcell(p["Режим ССКУ"], "st-muted")}
            ${lcell("Состояние канала ТМ/КИ")}
            ${vcell(p["Состояние канала ТМ/КИ"], c.channel)}
            ${lcell("Состояние ТМИ")}
            ${vcell(sat?.link === "ok" ? "поступает" : "нет", sat?.link === "ok" ? "st-ok" : "st-alarm")}
            ${lcell("Возраст ТМИ, мс")}
            ${vcell(ageMs, ageCls)}
          </tr>

          <tr>
            <td class="egytd-sec" colspan="8">Радиоканал и обмен</td>
          </tr>
          <tr>
            ${lcell("Уровень принимаемого сигнала, дБм")}
            ${vcell(p["Уровень принимаемого сигнала, дБм"], c.signal)}
            ${lcell("Скорость передачи ТМИ, кбит/с")}
            ${vcell(p["Скорость передачи ТМИ, кбит/с"], "st-muted")}
            ${lcell("Ошибки контроля целостности, шт")}
            ${vcell(p["Ошибки контроля целостности, шт"], c.integrity)}
            ${lcell("Повторы передачи, шт")}
            ${vcell(p["Повторы передачи, шт"], c.retry)}
          </tr>
          <tr>
            ${lcell("Превышения времени ожидания, шт")}
            ${vcell(p["Превышения времени ожидания, шт"], c.wait)}
            ${lcell("Синхронизация времени")}
            ${vcell(p["Синхронизация времени"], c.sync)}
            ${lcell("Приём командной информации")}
            ${vcell(p["Приём командной информации"], c.cmd)}
            ${lcell("Передача ТМИ")}
            ${vcell(p["Передача ТМИ"], c.tm)}
          </tr>
          <tr>
            ${lcell("Квитанции команд")}
            ${vcell(p["Квитанции команд"], c.ack)}
            ${lcell("Предельная скорость ССКУ")}
            ${vcell(`до ${th.SERVICE_RATE_MAX_KBIT_S} кбит/с`, "st-muted", `colspan="5"`)}
          </tr>
        </table>

        <div class="egy-footnote">
          <span class="mono">Назначение формата:</span> отображение текущих признаков служебного канала управления: приём КИ, передача ТМИ, качество обмена и синхронизация времени.
        </div>
      </div>
    </div>
  `;
}

function renderTtcControl(ctx){
  const { sat } = ctx;
  const sub = sat?.subsystems?.ttc;
  const p = sub?.params || {};
  const th = TH.ttc;
  const c = classes(ctx);

  const st = sat?.inactive ? "inactive" : (sub?.st || "warn");
  const msg = sub?.msg || "—";

  const ageMs = Date.now() - (sat?.lastUpdateMs || 0);
  const ageCls = ageMs > th.AGE_ALARM_MS || sat?.link !== "ok" ? "st-alarm" : "st-ok";

  const actionOverall =
    st === "ok" ? "штатный контроль" :
    st === "warn" ? "проверить качество служебного канала и повторяемость ошибок" :
    st === "alarm" ? "проверить канал ТМ/КИ, синхронизацию времени и возможность повторного сеанса" :
    "ожидать ввода КА в эксплуатацию";

  const rows = [
    checkRow(
      "Актуальность ТМИ",
      `${ageMs} мс`,
      `норма: возраст ТМИ ≤ ${th.AGE_ALARM_MS} мс`,
      ageCls,
      ageCls === "st-ok" ? "данные пригодны для контроля" : "ТМИ устарела или отсутствует",
      ageCls === "st-ok" ? "продолжить контроль" : "повторить получение ТМИ, проверить канал"
    ),
    checkRow(
      "Состояние канала ТМ/КИ",
      p["Состояние канала ТМ/КИ"],
      "канал должен быть установлен",
      c.channel,
      c.channel === "st-ok" ? "канал установлен" : "канал нарушен",
      c.channel === "st-ok" ? "действий не требуется" : "назначить повторный сеанс и проверить тракт ССКУ"
    ),
    checkRow(
      "Уровень принимаемого сигнала",
      `${safe(p["Уровень принимаемого сигнала, дБм"])} дБм`,
      `норма ≥${th.SIGNAL_OK_MIN_DBM} дБм; предупреждение ${th.SIGNAL_WARN_MIN_DBM}…${th.SIGNAL_OK_MIN_DBM}; авария <${th.SIGNAL_WARN_MIN_DBM}`,
      c.signal,
      c.signal === "st-ok" ? "запас радиолинии достаточен" : c.signal === "st-warn" ? "уровень сигнала снижен" : "уровень сигнала недопустимо низкий",
      c.signal === "st-ok" ? "действий не требуется" : "проверить геометрию сеанса, АФУ и качество радиолинии"
    ),
    checkRow(
      "Ошибки контроля целостности",
      p["Ошибки контроля целостности, шт"],
      `норма ≤${th.INTEGRITY_WARN_MAX}; предупреждение ${th.INTEGRITY_WARN_MAX}…${th.INTEGRITY_ALARM_MAX}; авария >${th.INTEGRITY_ALARM_MAX}`,
      c.integrity,
      c.integrity === "st-ok" ? "целостность кадров подтверждается" : c.integrity === "st-warn" ? "рост ошибок контроля целостности" : "ошибки целостности превышают аварийный порог",
      c.integrity === "st-ok" ? "действий не требуется" : "проверить качество приёма и повторить критические данные"
    ),
    checkRow(
      "Превышения времени ожидания",
      p["Превышения времени ожидания, шт"],
      `норма ≤${th.WAIT_WARN_MAX}; предупреждение ${th.WAIT_WARN_MAX}…${th.WAIT_ALARM_MAX}; авария >${th.WAIT_ALARM_MAX}`,
      c.wait,
      c.wait === "st-ok" ? "обмен укладывается в допустимое время" : c.wait === "st-warn" ? "рост задержек обмена" : "обмен не подтверждается в допустимое время",
      c.wait === "st-ok" ? "действий не требуется" : "проверить расписание сеанса и повтор передачи"
    ),
    checkRow(
      "Повторы передачи",
      p["Повторы передачи, шт"],
      `норма ≤${th.RETRY_WARN_MAX}; предупреждение ${th.RETRY_WARN_MAX}…${th.RETRY_ALARM_MAX}; авария >${th.RETRY_ALARM_MAX}`,
      c.retry,
      c.retry === "st-ok" ? "повторы незначительны" : c.retry === "st-warn" ? "увеличение повторов передачи" : "повторы передачи чрезмерны",
      c.retry === "st-ok" ? "действий не требуется" : "проверить устойчивость канала"
    ),
    checkRow(
      "Синхронизация времени",
      p["Синхронизация времени"],
      "для контроля ТМИ требуется синхронизация времени",
      c.sync,
      c.sync === "st-ok" ? "временная привязка сохранена" : "синхронизация времени нарушена",
      c.sync === "st-ok" ? "действий не требуется" : "проверить источник времени и привязку ТМИ"
    ),
    checkRow(
      "Квитанции команд",
      p["Квитанции команд"],
      "при выдаче КИ должны поступать квитанции исполнения/приёма",
      c.ack,
      c.ack === "st-ok" ? "квитанции команд поступают" : "нет квитанций команд",
      c.ack === "st-ok" ? "действий не требуется" : "проверить доставку КИ и повторить команду по регламенту"
    )
  ].join("");

  return `
    <div class="egyfmt">
      ${egyptHeader(ctx, "Контроль состояния")}

      <div class="egy-sheet">
        <table class="egy-table" cellspacing="0" cellpadding="0">
          <tr>
            <td class="egytd-top" colspan="6">Итоговая оценка состояния ССКУ</td>
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
          <span class="mono">Назначение формата:</span> не просто показать параметры радиолинии, а объяснить состояние служебного канала ТМ/КИ и пригодность данных для дальнейшей обработки.
        </div>
      </div>
    </div>
  `;
}

function renderTtcLink(ctx){
  const { sat } = ctx;
  const p = sat?.subsystems?.ttc?.params || {};
  const th = TH.ttc;
  const c = classes(ctx);

  return `
    <div class="egyfmt">
      ${egyptHeader(ctx, "Канал и обмен")}

      <div class="egy-grid">
        <div class="egy-box">
          <div class="egy-box-h">Радиоканал S-диапазона</div>
          ${cell("Уровень принимаемого сигнала, дБм", p["Уровень принимаемого сигнала, дБм"], c.signal)}
          ${cell("Скорость передачи ТМИ, кбит/с", p["Скорость передачи ТМИ, кбит/с"], "st-muted")}
          ${cell("Предельная скорость ССКУ", `до ${th.SERVICE_RATE_MAX_KBIT_S} кбит/с`, "st-muted")}
          ${cell("Состояние канала ТМ/КИ", p["Состояние канала ТМ/КИ"], c.channel)}
        </div>

        <div class="egy-box">
          <div class="egy-box-h">Качество обмена</div>
          ${cell("Ошибки контроля целостности, шт", p["Ошибки контроля целостности, шт"], c.integrity)}
          ${cell("Превышения времени ожидания, шт", p["Превышения времени ожидания, шт"], c.wait)}
          ${cell("Повторы передачи, шт", p["Повторы передачи, шт"], c.retry)}
          ${cell("Синхронизация времени", p["Синхронизация времени"], c.sync)}
        </div>

        <div class="egy-box" style="grid-column:1 / -1;">
          <div class="egy-box-h">Критерии контроля канала</div>
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
              ${rowCrit("Уровень принимаемого сигнала, дБм", p["Уровень принимаемого сигнала, дБм"], `≥ ${th.SIGNAL_OK_MIN_DBM}`, `${th.SIGNAL_WARN_MIN_DBM}…${th.SIGNAL_OK_MIN_DBM}`, `< ${th.SIGNAL_WARN_MIN_DBM}`)}
              ${rowCrit("Ошибки контроля целостности, шт", p["Ошибки контроля целостности, шт"], `≤ ${th.INTEGRITY_WARN_MAX}`, `${th.INTEGRITY_WARN_MAX}…${th.INTEGRITY_ALARM_MAX}`, `> ${th.INTEGRITY_ALARM_MAX}`)}
              ${rowCrit("Превышения времени ожидания, шт", p["Превышения времени ожидания, шт"], `≤ ${th.WAIT_WARN_MAX}`, `${th.WAIT_WARN_MAX}…${th.WAIT_ALARM_MAX}`, `> ${th.WAIT_ALARM_MAX}`)}
              ${rowCrit("Повторы передачи, шт", p["Повторы передачи, шт"], `≤ ${th.RETRY_WARN_MAX}`, `${th.RETRY_WARN_MAX}…${th.RETRY_ALARM_MAX}`, `> ${th.RETRY_ALARM_MAX}`)}
              ${rowCrit("Синхронизация времени", p["Синхронизация времени"], "норма", "—", "нет")}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}