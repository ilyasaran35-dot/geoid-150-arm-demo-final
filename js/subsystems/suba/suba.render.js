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
    s === "нарушен" ||
    s === "разомкнут" ||
    s === "отключён" ||
    s === "отключена" ||
    s === "запрещено" ||
    s === "сработала" ||
    s === "да"
  );
}

function isMissing(value){
  const s = String(value || "").trim().toLowerCase();
  return s === "нет" || isBad(value);
}

function clsByMax(v, warnMax, alarmMax){
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
  const p = ctx.sat?.subsystems?.suba?.params || {};
  const th = TH.suba;

  return {
    brkFeed: isBad(p["Фидер БРК"]) ? "st-warn" : "st-ok",
    afuFeed: isBad(p["Фидер АФУ"]) ? "st-warn" : "st-ok",
    brkProtect: isBad(p["Защита фидера БРК"]) ? "st-alarm" : "st-ok",
    afuProtect: isBad(p["Защита фидера АФУ"]) ? "st-alarm" : "st-ok",
    loadTrip: isBad(p["Аварийное отключение нагрузки"]) ? "st-alarm" : "st-ok",

    canState: String(p["Состояние CAN"] || "").toLowerCase() === "установлен" ? "st-ok" : "st-alarm",
    canOff: isBad(p["Отключение CAN"]) ? "st-alarm" : "st-ok",
    canIntegrity: clsByMax(p["Ошибки контроля целостности CAN, шт"], th.CAN_INTEGRITY_WARN_MAX, th.CAN_INTEGRITY_ALARM_MAX),
    canWait: clsByMax(p["Превышения времени ожидания CAN, шт"], th.CAN_WAIT_WARN_MAX, th.CAN_WAIT_ALARM_MAX),
    canRetry: clsByMax(p["Повторы CAN, шт"], th.CAN_RETRY_WARN_MAX, th.CAN_RETRY_ALARM_MAX),

    rsState: String(p["Состояние RS-485"] || "").toLowerCase() === "установлен" ? "st-ok" : "st-alarm",
    rsIntegrity: clsByMax(p["Ошибки контроля целостности RS-485, шт"], th.RS485_INTEGRITY_WARN_MAX, th.RS485_INTEGRITY_ALARM_MAX),
    rsWait: clsByMax(p["Превышения времени ожидания RS-485, шт"], th.RS485_WAIT_WARN_MAX, th.RS485_WAIT_ALARM_MAX),
    rsRetry: clsByMax(p["Повторы RS-485, шт"], th.RS485_RETRY_WARN_MAX, th.RS485_RETRY_ALARM_MAX),

    spwState: String(p["Состояние SpaceWire"] || "").toLowerCase() === "установлен" ? "st-ok" : "st-alarm",
    spwLine: clsByMax(p["Ошибки линии SpaceWire, шт"], th.SPW_LINE_WARN_MAX, th.SPW_LINE_ALARM_MAX),
    spwWait: clsByMax(p["Превышения времени ожидания SpaceWire, шт"], th.SPW_WAIT_WARN_MAX, th.SPW_WAIT_ALARM_MAX),
    spwRetry: clsByMax(p["Повторы SpaceWire, шт"], th.SPW_RETRY_WARN_MAX, th.SPW_RETRY_ALARM_MAX),

    brkPermit: isBad(p["Разрешение управления БРК"]) ? "st-warn" : "st-ok",
    afuPermit: isBad(p["Разрешение управления АФУ"]) ? "st-warn" : "st-ok",
    cmdAck: isMissing(p["Квитанции команд СУБА"]) ? "st-warn" : "st-ok",
    pnTm: isMissing(p["Телеметрия БРК/АФУ"]) ? "st-warn" : "st-ok",
  };
}

function egyptHeader(ctx, title){
  const { satNo, sat } = ctx;
  const sub = sat?.subsystems?.suba;
  const st = sat?.inactive ? "inactive" : (sub?.st || "warn");
  const p = sub?.params || {};

  const ageMs = Date.now() - (sat?.lastUpdateMs || 0);
  const qualityOk = sat?.link === "ok" && ageMs <= 8000;
  const quality = qualityOk ? "достоверна" : "нет достоверной ТМИ";
  const qCls = qualityOk ? "st-ok" : "st-alarm";

  return `
    <div class="egy-top">
      <div class="egy-title mono">[КА "${escapeHtml(String(satNo))}"] СУБА: ${escapeHtml(title)}</div>

      <div class="egy-line">
        <span class="badge ${badgeClass(st)}">${escapeHtml(stWord(st))}</span>
        <span class="chip ${qCls}">ТМИ: ${escapeHtml(quality)}</span>
        <span class="chip st-muted">ВО: <span class="mono">${escapeHtml(sat?.lastUpdate || "—")}</span></span>
        <span class="chip st-muted">Режим: <span class="mono">${escapeHtml(String(p["Режим СУБА"] || "—"))}</span></span>

        <span class="egy-sep"></span>

        <button class="btn-mini" data-open-sub="suba_current" data-open-title="СУБА: Текущее состояние">Текущее состояние</button>
        <button class="btn-mini" data-open-sub="suba_control" data-open-title="СУБА: Контроль состояния">Контроль состояния</button>
        <button class="btn-mini" data-open-sub="suba_if" data-open-title="СУБА: Интерфейсы">Интерфейсы</button>
        <button class="btn-mini" data-open-sub="suba_power" data-open-title="СУБА: Питание и фидеры">Питание и фидеры</button>
      </div>
    </div>
  `;
}

export function renderDetailSUBA(ctx){
  return renderSubaCurrent(ctx);
}

export function renderDetailSUBA_Control(ctx){
  return renderSubaControl(ctx);
}

export function renderDetailSUBA_Current(ctx){
  return renderSubaCurrent(ctx);
}

export function renderDetailSUBA_Power(ctx){
  return renderSubaPower(ctx);
}

export function renderDetailSUBA_If(ctx){
  return renderSubaIf(ctx);
}

function renderSubaCurrent(ctx){
  const { sat } = ctx;
  const p = sat?.subsystems?.suba?.params || {};
  const c = classes(ctx);

  return `
    <div class="egyfmt">
      ${egyptHeader(ctx, "Текущее состояние")}

      <div class="egy-sheet">
        <table class="egy-table" cellspacing="0" cellpadding="0">
          <tr>
            <td class="egytd-top" colspan="8">Текущие параметры СУБА</td>
          </tr>

          <tr>
            <td class="egytd-sec" colspan="8">Управление БРК и АФУ</td>
          </tr>
          <tr>
            ${lcell("Режим СУБА")}
            ${vcell(p["Режим СУБА"], "st-muted")}
            ${lcell("Разрешение управления БРК")}
            ${vcell(p["Разрешение управления БРК"], c.brkPermit)}
            ${lcell("Разрешение управления АФУ")}
            ${vcell(p["Разрешение управления АФУ"], c.afuPermit)}
            ${lcell("Квитанции команд СУБА")}
            ${vcell(p["Квитанции команд СУБА"], c.cmdAck)}
          </tr>
          <tr>
            ${lcell("Конфигурация БРК")}
            ${vcell(p["Конфигурация БРК"], "st-muted")}
            ${lcell("Конфигурация лучей АФУ")}
            ${vcell(p["Конфигурация лучей АФУ"], "st-muted")}
            ${lcell("Телеметрия БРК/АФУ")}
            ${vcell(p["Телеметрия БРК/АФУ"], c.pnTm, `colspan="3"`)}
          </tr>

          <tr>
            <td class="egytd-sec" colspan="8">Питание целевой аппаратуры</td>
          </tr>
          <tr>
            ${lcell("Фидер БРК")}
            ${vcell(p["Фидер БРК"], c.brkFeed)}
            ${lcell("Фидер АФУ")}
            ${vcell(p["Фидер АФУ"], c.afuFeed)}
            ${lcell("Защита фидера БРК")}
            ${vcell(p["Защита фидера БРК"], c.brkProtect)}
            ${lcell("Защита фидера АФУ")}
            ${vcell(p["Защита фидера АФУ"], c.afuProtect)}
          </tr>
          <tr>
            ${lcell("Аварийное отключение нагрузки")}
            ${vcell(p["Аварийное отключение нагрузки"], c.loadTrip, `colspan="7"`)}
          </tr>

          <tr>
            <td class="egytd-sec" colspan="8">Внутренние интерфейсы</td>
          </tr>
          <tr>
            ${lcell("Состояние CAN")}
            ${vcell(p["Состояние CAN"], c.canState)}
            ${lcell("Состояние RS-485")}
            ${vcell(p["Состояние RS-485"], c.rsState)}
            ${lcell("Состояние SpaceWire")}
            ${vcell(p["Состояние SpaceWire"], c.spwState)}
            ${lcell("Окно анализа")}
            ${vcell(`${TH.suba.WINDOW_S} с`, "st-muted")}
          </tr>
        </table>

        <div class="egy-footnote">
          <span class="mono">Назначение формата:</span> показать фактическое состояние СУБА как контура управления БРК/АФУ, фидерами и внутренними интерфейсами.
        </div>
      </div>
    </div>
  `;
}

function renderSubaControl(ctx){
  const { sat } = ctx;
  const sub = sat?.subsystems?.suba;
  const p = sub?.params || {};
  const th = TH.suba;
  const c = classes(ctx);
  const st = sat?.inactive ? "inactive" : (sub?.st || "warn");
  const msg = sub?.msg || "—";

  const ageMs = Date.now() - (sat?.lastUpdateMs || 0);
  const tmiCls = sat?.link === "ok" && ageMs <= 8000 ? "st-ok" : "st-alarm";

  const actionOverall =
    st === "ok" ? "штатный контроль" :
    st === "warn" ? "проверить повторы, квитанции команд и готовность управления БРК/АФУ" :
    st === "alarm" ? "ограничить БРК/АФУ, проверить фидеры и внутренние интерфейсы СУБА" :
    "ожидать ввода КА в эксплуатацию";

  const rows = [
    checkRow(
      "Качество ТМИ СУБА",
      tmiCls === "st-ok" ? "достоверна" : "нет достоверной ТМИ",
      "данные актуальны, связь с КА есть",
      tmiCls,
      tmiCls === "st-ok" ? "данные пригодны для контроля" : "данные нельзя использовать как достоверные",
      tmiCls === "st-ok" ? "продолжить контроль" : "проверить канал ТМ/КИ"
    ),
    checkRow(
      "Управление БРК",
      p["Разрешение управления БРК"],
      "управление БРК должно быть разрешено в штатном режиме",
      c.brkPermit,
      c.brkPermit === "st-ok" ? "управление БРК разрешено" : "управление БРК ограничено",
      c.brkPermit === "st-ok" ? "действий не требуется" : "проверить команды СУБА и состояние БРК"
    ),
    checkRow(
      "Управление АФУ",
      p["Разрешение управления АФУ"],
      "управление АФУ должно быть разрешено в штатном режиме",
      c.afuPermit,
      c.afuPermit === "st-ok" ? "управление АФУ разрешено" : "управление АФУ ограничено",
      c.afuPermit === "st-ok" ? "действий не требуется" : "проверить команды СУБА и состояние АФУ"
    ),
    checkRow(
      "Фидеры БРК/АФУ",
      `БРК: ${safe(p["Фидер БРК"])}; АФУ: ${safe(p["Фидер АФУ"])}`,
      "фидеры целевой аппаратуры должны быть включены либо отключены по плану",
      c.brkFeed === "st-ok" && c.afuFeed === "st-ok" ? "st-ok" : "st-warn",
      c.brkFeed === "st-ok" && c.afuFeed === "st-ok" ? "фидеры включены" : "зафиксировано отключение фидера",
      c.brkFeed === "st-ok" && c.afuFeed === "st-ok" ? "действий не требуется" : "проверить режим полезной нагрузки"
    ),
    checkRow(
      "Защиты фидеров",
      `БРК: ${safe(p["Защита фидера БРК"])}; АФУ: ${safe(p["Защита фидера АФУ"])}`,
      "срабатывание защиты фидера = аварийный признак",
      c.brkProtect === "st-ok" && c.afuProtect === "st-ok" ? "st-ok" : "st-alarm",
      c.brkProtect === "st-ok" && c.afuProtect === "st-ok" ? "защиты не сработали" : "зафиксировано срабатывание защиты",
      c.brkProtect === "st-ok" && c.afuProtect === "st-ok" ? "действий не требуется" : "запретить повторное включение без анализа ТМИ"
    ),
    checkRow(
      "CAN",
      `ошибки ${safe(p["Ошибки контроля целостности CAN, шт"])}, ожидания ${safe(p["Превышения времени ожидания CAN, шт"])}, повторы ${safe(p["Повторы CAN, шт"])}`,
      `ошибки ≤${th.CAN_INTEGRITY_WARN_MAX}; ожидания ≤${th.CAN_WAIT_WARN_MAX}; повторы ≤${th.CAN_RETRY_WARN_MAX}`,
      c.canState === "st-alarm" || c.canOff === "st-alarm" || c.canIntegrity === "st-alarm" || c.canWait === "st-alarm" || c.canRetry === "st-alarm" ? "st-alarm" :
      c.canIntegrity === "st-warn" || c.canWait === "st-warn" || c.canRetry === "st-warn" ? "st-warn" : "st-ok",
      "оценка обмена по CAN",
      "при деградации проверить команды СУБА и повтор передачи"
    ),
    checkRow(
      "RS-485",
      `ошибки ${safe(p["Ошибки контроля целостности RS-485, шт"])}, ожидания ${safe(p["Превышения времени ожидания RS-485, шт"])}, повторы ${safe(p["Повторы RS-485, шт"])}`,
      `ошибки ≤${th.RS485_INTEGRITY_WARN_MAX}; ожидания ≤${th.RS485_WAIT_WARN_MAX}; повторы ≤${th.RS485_RETRY_WARN_MAX}`,
      c.rsState === "st-alarm" || c.rsIntegrity === "st-alarm" || c.rsWait === "st-alarm" || c.rsRetry === "st-alarm" ? "st-alarm" :
      c.rsIntegrity === "st-warn" || c.rsWait === "st-warn" || c.rsRetry === "st-warn" ? "st-warn" : "st-ok",
      "оценка обмена по RS-485",
      "при деградации проверить линию и повтор команд"
    ),
    checkRow(
      "SpaceWire",
      `ошибки ${safe(p["Ошибки линии SpaceWire, шт"])}, ожидания ${safe(p["Превышения времени ожидания SpaceWire, шт"])}, повторы ${safe(p["Повторы SpaceWire, шт"])}`,
      `ошибки ≤${th.SPW_LINE_WARN_MAX}; ожидания ≤${th.SPW_WAIT_WARN_MAX}; повторы ≤${th.SPW_RETRY_WARN_MAX}`,
      c.spwState === "st-alarm" || c.spwLine === "st-alarm" || c.spwWait === "st-alarm" || c.spwRetry === "st-alarm" ? "st-alarm" :
      c.spwLine === "st-warn" || c.spwWait === "st-warn" || c.spwRetry === "st-warn" ? "st-warn" : "st-ok",
      "оценка обмена по SpaceWire",
      "при деградации проверить поток управления БРК/АФУ"
    )
  ].join("");

  return `
    <div class="egyfmt">
      ${egyptHeader(ctx, "Контроль состояния")}

      <div class="egy-sheet">
        <table class="egy-table" cellspacing="0" cellpadding="0">
          <tr>
            <td class="egytd-top" colspan="6">Итоговая оценка состояния СУБА</td>
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
          <span class="mono">Назначение формата:</span> объяснить, почему СУБА получила состояние «норма», «предупреждение» или «авария» как контур управления БРК/АФУ.
        </div>
      </div>
    </div>
  `;
}

function renderSubaIf(ctx){
  const { sat } = ctx;
  const p = sat?.subsystems?.suba?.params || {};
  const th = TH.suba;
  const c = classes(ctx);

  return `
    <div class="egyfmt">
      ${egyptHeader(ctx, "Интерфейсы")}

      <div class="egy-grid">
        <div class="egy-box">
          <div class="egy-box-h">CAN</div>
          ${cell("Состояние CAN", p["Состояние CAN"], c.canState)}
          ${cell("Отключение CAN", p["Отключение CAN"], c.canOff)}
          ${cell("Ошибки контроля целостности CAN, шт", p["Ошибки контроля целостности CAN, шт"], c.canIntegrity)}
          ${cell("Превышения времени ожидания CAN, шт", p["Превышения времени ожидания CAN, шт"], c.canWait)}
          ${cell("Повторы CAN, шт", p["Повторы CAN, шт"], c.canRetry)}
        </div>

        <div class="egy-box">
          <div class="egy-box-h">RS-485</div>
          ${cell("Состояние RS-485", p["Состояние RS-485"], c.rsState)}
          ${cell("Ошибки контроля целостности RS-485, шт", p["Ошибки контроля целостности RS-485, шт"], c.rsIntegrity)}
          ${cell("Превышения времени ожидания RS-485, шт", p["Превышения времени ожидания RS-485, шт"], c.rsWait)}
          ${cell("Повторы RS-485, шт", p["Повторы RS-485, шт"], c.rsRetry)}
        </div>

        <div class="egy-box">
          <div class="egy-box-h">SpaceWire</div>
          ${cell("Состояние SpaceWire", p["Состояние SpaceWire"], c.spwState)}
          ${cell("Ошибки линии SpaceWire, шт", p["Ошибки линии SpaceWire, шт"], c.spwLine)}
          ${cell("Превышения времени ожидания SpaceWire, шт", p["Превышения времени ожидания SpaceWire, шт"], c.spwWait)}
          ${cell("Повторы SpaceWire, шт", p["Повторы SpaceWire, шт"], c.spwRetry)}
        </div>

        <div class="egy-box" style="grid-column:1 / -1;">
          <div class="egy-box-h">Критерии контроля интерфейсов</div>
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
              ${rowCrit("CAN: ошибки контроля целостности, шт", p["Ошибки контроля целостности CAN, шт"], `≤ ${th.CAN_INTEGRITY_WARN_MAX}`, `${th.CAN_INTEGRITY_WARN_MAX}…${th.CAN_INTEGRITY_ALARM_MAX}`, `> ${th.CAN_INTEGRITY_ALARM_MAX}`)}
              ${rowCrit("CAN: превышения времени ожидания, шт", p["Превышения времени ожидания CAN, шт"], `≤ ${th.CAN_WAIT_WARN_MAX}`, `${th.CAN_WAIT_WARN_MAX}…${th.CAN_WAIT_ALARM_MAX}`, `> ${th.CAN_WAIT_ALARM_MAX}`)}
              ${rowCrit("CAN: повторы, шт", p["Повторы CAN, шт"], `≤ ${th.CAN_RETRY_WARN_MAX}`, `${th.CAN_RETRY_WARN_MAX}…${th.CAN_RETRY_ALARM_MAX}`, `> ${th.CAN_RETRY_ALARM_MAX}`)}
              ${rowCrit("RS-485: ошибки контроля целостности, шт", p["Ошибки контроля целостности RS-485, шт"], `≤ ${th.RS485_INTEGRITY_WARN_MAX}`, `${th.RS485_INTEGRITY_WARN_MAX}…${th.RS485_INTEGRITY_ALARM_MAX}`, `> ${th.RS485_INTEGRITY_ALARM_MAX}`)}
              ${rowCrit("RS-485: превышения времени ожидания, шт", p["Превышения времени ожидания RS-485, шт"], `≤ ${th.RS485_WAIT_WARN_MAX}`, `${th.RS485_WAIT_WARN_MAX}…${th.RS485_WAIT_ALARM_MAX}`, `> ${th.RS485_WAIT_ALARM_MAX}`)}
              ${rowCrit("RS-485: повторы, шт", p["Повторы RS-485, шт"], `≤ ${th.RS485_RETRY_WARN_MAX}`, `${th.RS485_RETRY_WARN_MAX}…${th.RS485_RETRY_ALARM_MAX}`, `> ${th.RS485_RETRY_ALARM_MAX}`)}
              ${rowCrit("SpaceWire: ошибки линии, шт", p["Ошибки линии SpaceWire, шт"], `≤ ${th.SPW_LINE_WARN_MAX}`, `${th.SPW_LINE_WARN_MAX}…${th.SPW_LINE_ALARM_MAX}`, `> ${th.SPW_LINE_ALARM_MAX}`)}
              ${rowCrit("SpaceWire: превышения времени ожидания, шт", p["Превышения времени ожидания SpaceWire, шт"], `≤ ${th.SPW_WAIT_WARN_MAX}`, `${th.SPW_WAIT_WARN_MAX}…${th.SPW_WAIT_ALARM_MAX}`, `> ${th.SPW_WAIT_ALARM_MAX}`)}
              ${rowCrit("SpaceWire: повторы, шт", p["Повторы SpaceWire, шт"], `≤ ${th.SPW_RETRY_WARN_MAX}`, `${th.SPW_RETRY_WARN_MAX}…${th.SPW_RETRY_ALARM_MAX}`, `> ${th.SPW_RETRY_ALARM_MAX}`)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function renderSubaPower(ctx){
  const { sat } = ctx;
  const p = sat?.subsystems?.suba?.params || {};
  const c = classes(ctx);

  return `
    <div class="egyfmt">
      ${egyptHeader(ctx, "Питание и фидеры")}

      <div class="egy-grid">
        <div class="egy-box">
          <div class="egy-box-h">Фидеры целевой аппаратуры</div>
          ${cell("Фидер БРК", p["Фидер БРК"], c.brkFeed)}
          ${cell("Фидер АФУ", p["Фидер АФУ"], c.afuFeed)}
          ${cell("Аварийное отключение нагрузки", p["Аварийное отключение нагрузки"], c.loadTrip)}
        </div>

        <div class="egy-box">
          <div class="egy-box-h">Защитные признаки</div>
          ${cell("Защита фидера БРК", p["Защита фидера БРК"], c.brkProtect)}
          ${cell("Защита фидера АФУ", p["Защита фидера АФУ"], c.afuProtect)}
          ${cell("Рекомендуемое действие", c.brkProtect === "st-alarm" || c.afuProtect === "st-alarm" ? "не включать фидер без анализа ТМИ" : "штатный контроль", "st-muted")}
        </div>

        <div class="egy-box" style="grid-column:1 / -1;">
          <div class="egy-note">
            <div class="egy-note-row"><b>Норма:</b> фидеры БРК и АФУ включены либо отключены по заданному режиму; защиты не сработали.</div>
            <div class="egy-note-row"><b>Предупреждение:</b> фидер БРК/АФУ отключён при отсутствии аварийного признака; требуется проверка режима полезной нагрузки.</div>
            <div class="egy-note-row"><b>Авария:</b> сработала защита фидера или зафиксировано аварийное отключение нагрузки.</div>
          </div>
        </div>
      </div>
    </div>
  `;
}