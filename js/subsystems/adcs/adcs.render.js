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

function yes(value){
  const s = String(value || "").trim().toLowerCase();
  return s === "да" || s === "есть" || s === "сработал" || s === "сработала" || s === "запрещён" || s === "запрещена";
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
  const p = ctx.sat?.subsystems?.adcs?.params || {};
  const th = TH.adcs;
  const ageMs = Date.now() - (ctx.sat?.lastUpdateMs || 0);

  const star = Number(p["Валидные звёздные измерения, шт"]);
  const sun = Number(p["Валидные солнечные измерения, шт"]);
  const gyro = Number(p["Валидные измерения гиродатчиков, шт"]);
  const gmax = Number(p["Gmax, %"]);

  const preciseReady = star >= th.STAR_VALID_OK_MIN && gyro >= th.GYRO_VALID_OK_MIN;
  const coarseReady = sun >= th.SUN_VALID_WARN_MIN && gyro >= th.GYRO_VALID_WARN_MIN;

  return {
    age: ageMs > th.ORIENT_AGE_ALARM_MS ? "st-alarm" : ageMs > th.ORIENT_AGE_WARN_MS ? "st-warn" : "st-ok",
    attErr: clsByMax(p["Ошибка ориентации, угл.сек"], th.ATT_ERR_WARN_ARCSEC, th.ATT_ERR_ALARM_ARCSEC),
    sigma: clsByMax(p["СКО определения ориентации, угл.сек"], th.ATT_SIGMA_WARN_ARCSEC, th.ATT_SIGMA_ALARM_ARCSEC),
    rate: clsByMax(p["Угловая скорость, град/с"], th.RATE_WARN_DPS, th.RATE_ALARM_DPS),
    star: clsByMin(p["Валидные звёздные измерения, шт"], 0.5, th.STAR_VALID_OK_MIN),
    sun: clsByMin(p["Валидные солнечные измерения, шт"], 0.5, th.SUN_VALID_WARN_MIN),
    gyro: clsByMin(p["Валидные измерения гиродатчиков, шт"], th.GYRO_VALID_WARN_MIN, th.GYRO_VALID_OK_MIN),
    sensorSet: preciseReady ? "st-ok" : coarseReady ? "st-warn" : "st-alarm",
    sensorBan: yes(p["Запрет датчиков ориентации"]) ? "st-alarm" : "st-ok",
    wheels: ["готов", "готовы"].includes(String(p["Готовность маховиков"] || "").trim().toLowerCase()) ? "st-ok" : "st-alarm",
    gx: clsByMax(Math.abs(Number(p["Gx, %"])), th.MOMENT_WARN_PCT, th.MOMENT_ALARM_PCT),
    gy: clsByMax(Math.abs(Number(p["Gy, %"])), th.MOMENT_WARN_PCT, th.MOMENT_ALARM_PCT),
    gz: clsByMax(Math.abs(Number(p["Gz, %"])), th.MOMENT_WARN_PCT, th.MOMENT_ALARM_PCT),
    gmax: clsByMax(gmax, th.MOMENT_WARN_PCT, th.MOMENT_ALARM_PCT),
    saturation: yes(p["Насыщение маховиков"]) ? "st-alarm" : "st-ok",
    unload: String(p["Разгрузка кинетического момента"] || "нет").toLowerCase() === "идёт" ? "st-warn" : "st-ok",
    unloadPermit: String(p["Разрешение разгрузки"] || "разрешена").toLowerCase() === "запрещена" ? "st-alarm" : "st-ok",
    actuatorBan: yes(p["Запрет исполнительных органов"]) ? "st-alarm" : "st-ok",
  };
}

function egyptHeader(ctx, title){
  const { satNo, sat } = ctx;
  const sub = sat?.subsystems?.adcs;
  const st = sat?.inactive ? "inactive" : (sub?.st || "warn");
  const p = sub?.params || {};
  const th = TH.adcs;

  const ageMs = Date.now() - (sat?.lastUpdateMs || 0);
  const qualityOk = (sat?.link === "ok" && ageMs <= th.ORIENT_AGE_ALARM_MS);
  const quality = qualityOk ? "достоверна" : "нет достоверной ТМИ";
  const qCls = qualityOk ? "st-ok" : "st-alarm";

  return `
    <div class="egy-top">
      <div class="egy-title mono">[КА "${escapeHtml(String(satNo))}"] СУДН (ориентация): ${escapeHtml(title)}</div>

      <div class="egy-line">
        <span class="badge ${badgeClass(st)}">${escapeHtml(stWord(st))}</span>
        <span class="chip ${qCls}">ТМИ: ${escapeHtml(quality)}</span>
        <span class="chip st-muted">ВО: <span class="mono">${escapeHtml(sat?.lastUpdate || "—")}</span></span>
        <span class="chip st-muted">Режим: <span class="mono">${escapeHtml(String(p["Режим ориентации"] || "—"))}</span></span>
        <span class="chip st-muted">Контур: <span class="mono">${escapeHtml(String(p["Контур управления"] || "—"))}</span></span>

        <span class="egy-sep"></span>

        <button class="btn-mini" data-open-sub="adcs_current" data-open-title="СУДН (ориентация): Текущее состояние">Текущее состояние</button>
        <button class="btn-mini" data-open-sub="adcs_control" data-open-title="СУДН (ориентация): Контроль состояния">Контроль состояния</button>
        <button class="btn-mini" data-open-sub="adcs_momentum" data-open-title="СУДН (ориентация): Маховики и разгрузка">Маховики и разгрузка</button>
      </div>
    </div>
  `;
}

export function renderDetailADCS(ctx){
  return renderAdcsCurrent(ctx);
}

export function renderDetailADCS_Control(ctx){
  return renderAdcsControl(ctx);
}

export function renderDetailADCS_Current(ctx){
  return renderAdcsCurrent(ctx);
}

export function renderDetailADCS_Momentum(ctx){
  return renderAdcsMomentum(ctx);
}

function renderAdcsCurrent(ctx){
  const { sat } = ctx;
  const p = sat?.subsystems?.adcs?.params || {};
  const th = TH.adcs;
  const c = classes(ctx);
  const ageMs = Date.now() - (sat?.lastUpdateMs || 0);

  return `
    <div class="egyfmt">
      ${egyptHeader(ctx, "Текущее состояние")}

      <div class="egy-sheet">
        <table class="egy-table" cellspacing="0" cellpadding="0">
          <tr>
            <td class="egytd-top" colspan="8">Текущие параметры СУДН (ориентация)</td>
          </tr>

          <tr>
            <td class="egytd-sec" colspan="8">Режим, автомат и контуры управления</td>
          </tr>
          <tr>
            ${lcell("Режим ориентации")}
            ${vcell(p["Режим ориентации"], "st-muted")}
            ${lcell("Состояние автомата ориентации")}
            ${vcell(p["Состояние автомата ориентации"], "st-muted")}
            ${lcell("Контур управления")}
            ${vcell(p["Контур управления"], c.sensorSet)}
            ${lcell("Приоритет контуров")}
            ${vcell(p["Приоритет контуров"] || "ГД → СГ", "st-muted")}
          </tr>
          <tr>
            ${lcell("Источник ориентации")}
            ${vcell(p["Источник ориентации"], "st-muted")}
            ${lcell("Готовность точной ориентации")}
            ${vcell(p["Готовность точной ориентации"], c.sensorSet)}
            ${lcell("Причина перехода режима")}
            ${vcell(p["Причина перехода режима"], "st-muted", `colspan="3"`)}
          </tr>

          <tr>
            <td class="egytd-sec" colspan="8">Точность ориентации и скорость вращения</td>
          </tr>
          <tr>
            ${lcell("Ошибка ориентации, угл.сек")}
            ${vcell(p["Ошибка ориентации, угл.сек"], c.attErr)}
            ${lcell("СКО определения ориентации, угл.сек")}
            ${vcell(p["СКО определения ориентации, угл.сек"], c.sigma)}
            ${lcell("Угловая скорость, град/с")}
            ${vcell(p["Угловая скорость, град/с"], c.rate)}
            ${lcell("Возраст решения ориентации, мс")}
            ${vcell(ageMs, c.age)}
          </tr>

          <tr>
            <td class="egytd-sec" colspan="8">Датчики ориентации</td>
          </tr>
          <tr>
            ${lcell("Валидные звёздные измерения, шт")}
            ${vcell(p["Валидные звёздные измерения, шт"], c.star)}
            ${lcell("Валидные солнечные измерения, шт")}
            ${vcell(p["Валидные солнечные измерения, шт"], c.sun)}
            ${lcell("Валидные измерения гиродатчиков, шт")}
            ${vcell(p["Валидные измерения гиродатчиков, шт"], c.gyro)}
            ${lcell("Запрет датчиков ориентации")}
            ${vcell(p["Запрет датчиков ориентации"], c.sensorBan)}
          </tr>
          <tr>
            ${lcell("Состояние звёздных датчиков")}
            ${vcell(p["Состояние звёздных датчиков"], c.star)}
            ${lcell("Состояние солнечных датчиков")}
            ${vcell(p["Состояние солнечных датчиков"], c.sun)}
            ${lcell("Состояние гиродатчиков")}
            ${vcell(p["Состояние гиродатчиков"], c.gyro, `colspan="3"`)}
          </tr>

          <tr>
            <td class="egytd-sec" colspan="8">Исполнительные органы и кинетический момент</td>
          </tr>
          <tr>
            ${lcell("Исполнительный контур")}
            ${vcell(p["Исполнительный контур"], "st-muted")}
            ${lcell("Готовность маховиков")}
            ${vcell(p["Готовность маховиков"], c.wheels)}
            ${lcell("Gmax, %")}
            ${vcell(p["Gmax, %"], c.gmax)}
            ${lcell("Разгрузка кинетического момента")}
            ${vcell(p["Разгрузка кинетического момента"], c.unload)}
          </tr>
          <tr>
            ${lcell("Насыщение маховиков")}
            ${vcell(p["Насыщение маховиков"], c.saturation)}
            ${lcell("Разрешение разгрузки")}
            ${vcell(p["Разрешение разгрузки"], c.unloadPermit)}
            ${lcell("Запрет исполнительных органов")}
            ${vcell(p["Запрет исполнительных органов"], c.actuatorBan)}
            ${lcell("Источник времени")}
            ${vcell(th.TIME_SOURCE, "st-muted")}
          </tr>
        </table>

        <div class="egy-footnote">
          <span class="mono">Назначение формата:</span> отображение фактических параметров ориентации, датчиков и исполнительных органов без развернутой диагностической интерпретации.
        </div>
      </div>
    </div>
  `;
}

function renderAdcsControl(ctx){
  const { sat } = ctx;
  const sub = sat?.subsystems?.adcs;
  const p = sub?.params || {};
  const th = TH.adcs;
  const c = classes(ctx);
  const ageMs = Date.now() - (sat?.lastUpdateMs || 0);
  const st = sat?.inactive ? "inactive" : (sub?.st || "warn");
  const msg = sub?.msg || "—";

  const actionOverall =
    st === "ok" ? "штатный контроль" :
    st === "warn" ? "проверить точность ориентации, датчики и рост кинетического момента" :
    st === "alarm" ? "перевести КА в безопасную ориентацию или ограничить режимы, требующие точного наведения" :
    "ожидать ввода КА в эксплуатацию";

  const rows = [
    checkRow(
      "Актуальность решения ориентации",
      `${ageMs} мс`,
      `предупреждение >${th.ORIENT_AGE_WARN_MS} мс; авария >${th.ORIENT_AGE_ALARM_MS} мс`,
      c.age,
      c.age === "st-ok" ? "решение ориентации актуально" : c.age === "st-warn" ? "возраст решения повышен" : "решение ориентации устарело",
      c.age === "st-ok" ? "действий не требуется" : "проверить поступление ТМИ и временную привязку"
    ),
    checkRow(
      "Ошибка ориентации",
      `${safe(p["Ошибка ориентации, угл.сек"])} угл.сек`,
      `норма ≤${th.ATT_ERR_WARN_ARCSEC}; предупреждение ${th.ATT_ERR_WARN_ARCSEC}…${th.ATT_ERR_ALARM_ARCSEC}; авария >${th.ATT_ERR_ALARM_ARCSEC}`,
      c.attErr,
      c.attErr === "st-ok" ? "ориентация удерживается" : c.attErr === "st-warn" ? "ошибка ориентации растёт" : "потеря точности ориентации",
      c.attErr === "st-ok" ? "действий не требуется" : "проверить режим ориентации и контур управления"
    ),
    checkRow(
      "СКО определения ориентации",
      `${safe(p["СКО определения ориентации, угл.сек"])} угл.сек`,
      `норма ≤${th.ATT_SIGMA_WARN_ARCSEC}; предупреждение ${th.ATT_SIGMA_WARN_ARCSEC}…${th.ATT_SIGMA_ALARM_ARCSEC}; авария >${th.ATT_SIGMA_ALARM_ARCSEC}`,
      c.sigma,
      c.sigma === "st-ok" ? "точность определения ориентации достаточна" : c.sigma === "st-warn" ? "точность снижена" : "точность недостаточна для штатного контура",
      c.sigma === "st-ok" ? "действий не требуется" : "проверить звёздные датчики и гиродатчики"
    ),
    checkRow(
      "Угловая скорость",
      `${safe(p["Угловая скорость, град/с"])} град/с`,
      `норма ≤${th.RATE_WARN_DPS}; предупреждение ${th.RATE_WARN_DPS}…${th.RATE_ALARM_DPS}; авария >${th.RATE_ALARM_DPS}`,
      c.rate,
      c.rate === "st-ok" ? "скорость стабилизирована" : c.rate === "st-warn" ? "рост угловой скорости" : "требуется гашение угловых скоростей",
      c.rate === "st-ok" ? "действий не требуется" : "проверить режим гашения и исполнительные органы"
    ),
    checkRow(
      "Набор датчиков ориентации",
      `ЗД: ${safe(p["Валидные звёздные измерения, шт"])}; СД: ${safe(p["Валидные солнечные измерения, шт"])}; ГД: ${safe(p["Валидные измерения гиродатчиков, шт"])}`,
      `точный контур: ЗД ≥${th.STAR_VALID_OK_MIN} и ГД ≥${th.GYRO_VALID_OK_MIN}; резервный контур: СД ≥${th.SUN_VALID_WARN_MIN} и ГД ≥${th.GYRO_VALID_WARN_MIN}`,
      c.sensorSet,
      c.sensorSet === "st-ok" ? "точный контур готов" : c.sensorSet === "st-warn" ? "точный контур ограничен, доступен резервный контур" : "недостаточно валидных измерений",
      c.sensorSet === "st-ok" ? "действий не требуется" : "проверить датчики ориентации и условия засветки"
    ),
    checkRow(
      "Кинетический момент маховиков",
      `Gmax = ${safe(p["Gmax, %"])} %`,
      `норма <${th.MOMENT_WARN_PCT}%; предупреждение ${th.MOMENT_WARN_PCT}…${th.MOMENT_ALARM_PCT}%; авария ≥${th.MOMENT_ALARM_PCT}%`,
      c.gmax,
      c.gmax === "st-ok" ? "запас по моменту достаточен" : c.gmax === "st-warn" ? "накопление кинетического момента" : "насыщение маховиков",
      c.gmax === "st-ok" ? "действий не требуется" : c.gmax === "st-warn" ? "подготовить разгрузку" : "запустить разгрузку или ограничить режимы"
    ),
    checkRow(
      "Разгрузка кинетического момента",
      p["Разгрузка кинетического момента"],
      `запуск при Gmax ≥${th.MOMENT_UNLOAD_START_PCT}%; завершение при Gmax ≤${th.MOMENT_UNLOAD_STOP_PCT}%`,
      c.unload,
      c.unload === "st-ok" ? "разгрузка не требуется" : "идёт разгрузка кинетического момента",
      c.unload === "st-ok" ? "действий не требуется" : "контролировать снижение Gmax и запреты разгрузки"
    ),
    checkRow(
      "Запрет исполнительных органов",
      p["Запрет исполнительных органов"],
      "запрет исполнительных органов = аварийный признак для штатной ориентации",
      c.actuatorBan,
      c.actuatorBan === "st-ok" ? "исполнительные органы разрешены" : "исполнительные органы запрещены",
      c.actuatorBan === "st-ok" ? "действий не требуется" : "перевести КА в безопасную ориентацию"
    )
  ].join("");

  return `
    <div class="egyfmt">
      ${egyptHeader(ctx, "Контроль состояния")}

      <div class="egy-sheet">
        <table class="egy-table" cellspacing="0" cellpadding="0">
          <tr>
            <td class="egytd-top" colspan="6">Итоговая оценка СУДН (ориентация)</td>
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
            <td class="egytd-sec" colspan="6">Результаты алгоритма контроля ориентации</td>
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
          <span class="mono">Назначение формата:</span> объяснить состояние ориентации по точности, датчикам, исполнительным органам и кинетическому моменту.
        </div>
      </div>
    </div>
  `;
}

function renderAdcsMomentum(ctx){
  const { sat } = ctx;
  const p = sat?.subsystems?.adcs?.params || {};
  const th = TH.adcs;
  const c = classes(ctx);

  return `
    <div class="egyfmt">
      ${egyptHeader(ctx, "Маховики и разгрузка")}

      <div class="egy-grid">
        <div class="egy-box">
          <div class="egy-box-h">Кинетический момент маховиков</div>
          ${cell("Gx, %", p["Gx, %"], c.gx)}
          ${cell("Gy, %", p["Gy, %"], c.gy)}
          ${cell("Gz, %", p["Gz, %"], c.gz)}
          ${cell("Gmax, %", p["Gmax, %"], c.gmax)}
        </div>

        <div class="egy-box">
          <div class="egy-box-h">Разгрузка</div>
          ${cell("Насыщение маховиков", p["Насыщение маховиков"], c.saturation)}
          ${cell("Разгрузка кинетического момента", p["Разгрузка кинетического момента"], c.unload)}
          ${cell("Разрешение разгрузки", p["Разрешение разгрузки"], c.unloadPermit)}
          ${cell("Исполнительный контур", p["Исполнительный контур"], "st-muted")}
        </div>

        <div class="egy-box">
          <div class="egy-box-h">Исполнительные органы</div>
          ${cell("Готовность маховиков", p["Готовность маховиков"], c.wheels)}
          ${cell("Запрет исполнительных органов", p["Запрет исполнительных органов"], c.actuatorBan)}
          ${cell("Контур управления", p["Контур управления"], c.sensorSet)}
          ${cell("Состояние автомата ориентации", p["Состояние автомата ориентации"], "st-muted")}
        </div>

        <div class="egy-box" style="grid-column:1 / -1;">
          <div class="egy-box-h">Критерии кинетического момента</div>
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
              ${rowCrit("Gmax, %", p["Gmax, %"], `< ${th.MOMENT_WARN_PCT}`, `${th.MOMENT_WARN_PCT}…${th.MOMENT_ALARM_PCT}`, `≥ ${th.MOMENT_ALARM_PCT}`)}
              ${rowCrit("Запуск разгрузки", p["Разгрузка кинетического момента"], `Gmax < ${th.MOMENT_UNLOAD_START_PCT}`, `Gmax ≥ ${th.MOMENT_UNLOAD_START_PCT}`, `Gmax ≥ ${th.MOMENT_ALARM_PCT} или разгрузка запрещена`)}
              ${rowCrit("Завершение разгрузки", p["Gmax, %"], `Gmax ≤ ${th.MOMENT_UNLOAD_STOP_PCT}`, `Gmax > ${th.MOMENT_UNLOAD_STOP_PCT}`, `Gmax не снижается при активной разгрузке`)}
            </tbody>
          </table>
        </div>

        <div class="egy-box" style="grid-column:1 / -1;">
          <div class="egy-box-h">Автомат состояний ориентации</div>
          <table class="ptable">
            <thead>
              <tr>
                <th>Состояние</th>
                <th>Условие входа</th>
                <th>Условие выхода</th>
                <th>Приоритет</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>безопасная ориентация</td><td>запрет ИО или нет достаточных датчиков</td><td>восстановление датчиков и снятие запретов</td><td>1</td></tr>
              <tr><td>гашение угловых скоростей</td><td>угловая скорость выше аварийного порога</td><td>скорость снижена до допустимого уровня</td><td>2</td></tr>
              <tr><td>разгрузка кинетического момента</td><td>Gmax достиг порога запуска разгрузки</td><td>Gmax снижен до порога завершения</td><td>3</td></tr>
              <tr><td>трёхосная ориентация</td><td>датчики и ИО готовы, ошибки в норме</td><td>возникновение события более высокого приоритета</td><td>4</td></tr>
            </tbody>
          </table>
        </div>

        <div class="egy-box" style="grid-column:1 / -1;">
          <div class="egy-note">
            <div class="egy-note-row"><b>Приоритет контуров:</b> сначала используется точный контур ГД; при ограничении звёздных измерений допускается переход на резервный контур СГ.</div>
            <div class="egy-note-row"><b>Разгрузка:</b> запускается при накоплении кинетического момента и не должна выполняться при запрете исполнительных органов или запрете разгрузки.</div>
          </div>
        </div>
      </div>
    </div>
  `;
}
