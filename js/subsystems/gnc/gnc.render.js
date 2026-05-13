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

function clsByMax(v, okMax, alarmMax){
  const n = num(v);
  if(n == null) return "st-muted";
  if(n > alarmMax) return "st-alarm";
  if(n > okMax) return "st-warn";
  return "st-ok";
}

function clsByMin(v, alarmMin, okMin){
  const n = num(v);
  if(n == null) return "st-muted";
  if(n < alarmMin) return "st-alarm";
  if(n < okMin) return "st-warn";
  return "st-ok";
}

function isYes(value){
  const s = String(value || "").trim().toLowerCase();
  return s === "да" || s === "есть" || s === "идёт" || s === "выполняется" || s === "активна";
}

function readyClass(value){
  const s = String(value || "").trim().toLowerCase();
  if(s === "не готово" || s === "нет" || s === "ошибка" || s === "отказ") return "st-alarm";
  if(s === "ограничено" || s === "частично" || s === "уточняется") return "st-warn";
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
  const p = ctx.sat?.subsystems?.gnc?.params || {};
  const th = TH.gnc;
  const ageTmi = Date.now() - (ctx.sat?.lastUpdateMs || 0);
  const dvDelta = num(p["Расхождение ΔV, мм/с"]);

  return {
    tmi: ageTmi > th.NAV_AGE_ALARM_MS || ctx.sat?.link !== "ok" ? "st-alarm" : ageTmi > th.NAV_AGE_WARN_MS ? "st-warn" : "st-ok",
    ready: readyClass(p["Готовность навигационного решения"]),
    pos: clsByMax(p["СКО положения, м"], th.POS_SIGMA_OK_MAX_M, th.POS_SIGMA_ALARM_MAX_M),
    vel: clsByMax(p["СКО скорости, м/с"], th.VEL_SIGMA_OK_MAX_MS, th.VEL_SIGMA_ALARM_MAX_MS),
    meas: clsByMin(p["Валидные навигационные измерения, шт"], th.VALID_NAV_MEAS_WARN_MIN, th.VALID_NAV_MEAS_OK_MIN),
    navAge: clsByMax(p["Возраст навигационного решения, мс"], th.NAV_AGE_WARN_MS, th.NAV_AGE_ALARM_MS),
    flag: isYes(p["Флаг коррекции орбиты"]) ? "st-warn" : "st-ok",
    maneuver: isYes(p["Манёвр коррекции"]) ? "st-warn" : "st-ok",
    dv: dvDelta == null ? "st-muted" : clsByMax(dvDelta, th.DV_WARN_MMS, th.DV_ALARM_MMS),
    permit: String(p["Разрешение коррекции"] || "").toLowerCase() === "запрещена" ? "st-alarm" : "st-ok"
  };
}

function egyptHeader(ctx, title){
  const { satNo, sat } = ctx;
  const sub = sat?.subsystems?.gnc;
  const st = sat?.inactive ? "inactive" : (sub?.st || "warn");
  const p = sub?.params || {};
  const th = TH.gnc;

  const ageMs = Date.now() - (sat?.lastUpdateMs || 0);
  const qualityOk = sat?.link === "ok" && ageMs <= th.NAV_AGE_ALARM_MS;
  const quality = qualityOk ? "достоверна" : "нет достоверной ТМИ";
  const qCls = qualityOk ? "st-ok" : "st-alarm";

  return `
    <div class="egy-top">
      <div class="egy-title mono">[КА "${escapeHtml(String(satNo))}"] СУДН (навигация): ${escapeHtml(title)}</div>

      <div class="egy-line">
        <span class="badge ${badgeClass(st)}">${escapeHtml(stWord(st))}</span>
        <span class="chip ${qCls}">ТМИ: ${escapeHtml(quality)}</span>
        <span class="chip st-muted">ВО: <span class="mono">${escapeHtml(sat?.lastUpdate || "—")}</span></span>
        <span class="chip st-muted">Источник: <span class="mono">${escapeHtml(String(p["Источник навигации"] || "—"))}</span></span>
        <span class="chip st-muted">Режим: <span class="mono">${escapeHtml(String(p["Режим СУДН"] || "—"))}</span></span>

        <span class="egy-sep"></span>

        <button class="btn-mini" data-open-sub="gnc_current" data-open-title="СУДН (навигация): Текущее состояние">Текущее состояние</button>
        <button class="btn-mini" data-open-sub="gnc_control" data-open-title="СУДН (навигация): Контроль состояния">Контроль состояния</button>
        <button class="btn-mini" data-open-sub="gnc_maneuver" data-open-title="СУДН (навигация): Манёвр и коррекция">Манёвр и коррекция</button>
      </div>
    </div>
  `;
}

export function renderDetailGNC(ctx){
  return renderGncCurrent(ctx);
}

export function renderDetailGNC_Control(ctx){
  return renderGncControl(ctx);
}

export function renderDetailGNC_Current(ctx){
  return renderGncCurrent(ctx);
}

export function renderDetailGNC_Maneuver(ctx){
  return renderGncManeuver(ctx);
}

function renderGncCurrent(ctx){
  const { sat } = ctx;
  const p = sat?.subsystems?.gnc?.params || {};
  const th = TH.gnc;
  const c = classes(ctx);
  const ageTmi = Date.now() - (sat?.lastUpdateMs || 0);

  return `
    <div class="egyfmt">
      ${egyptHeader(ctx, "Текущее состояние")}

      <div class="egy-sheet">
        <table class="egy-table" cellspacing="0" cellpadding="0">
          <tr>
            <td class="egytd-top" colspan="8">Текущие параметры навигационного контура СУДН</td>
          </tr>

          <tr>
            <td class="egytd-sec" colspan="8">Навигационное решение</td>
          </tr>
          <tr>
            ${lcell("Источник навигации")}
            ${vcell(p["Источник навигации"], "st-muted")}
            ${lcell("Готовность навигационного решения")}
            ${vcell(p["Готовность навигационного решения"], c.ready)}
            ${lcell("Валидные навигационные измерения, шт")}
            ${vcell(p["Валидные навигационные измерения, шт"], c.meas)}
            ${lcell("Возраст ТМИ, мс")}
            ${vcell(ageTmi, c.tmi)}
          </tr>
          <tr>
            ${lcell("СКО положения, м")}
            ${vcell(p["СКО положения, м"], c.pos)}
            ${lcell("СКО скорости, м/с")}
            ${vcell(p["СКО скорости, м/с"], c.vel)}
            ${lcell("Возраст навигационного решения, мс")}
            ${vcell(p["Возраст навигационного решения, мс"], c.navAge)}
            ${lcell("Источник времени")}
            ${vcell(th.TIME_SOURCE, "st-muted")}
          </tr>

          <tr>
            <td class="egytd-sec" colspan="8">Коррекция орбиты</td>
          </tr>
          <tr>
            ${lcell("Режим СУДН")}
            ${vcell(p["Режим СУДН"], "st-muted")}
            ${lcell("Флаг коррекции орбиты")}
            ${vcell(p["Флаг коррекции орбиты"], c.flag)}
            ${lcell("Тип коррекции")}
            ${vcell(p["Тип коррекции"], "st-muted")}
            ${lcell("Разрешение коррекции")}
            ${vcell(p["Разрешение коррекции"], c.permit)}
          </tr>
          <tr>
            ${lcell("Манёвр коррекции")}
            ${vcell(p["Манёвр коррекции"], c.maneuver)}
            ${lcell("Состояние автомата коррекции")}
            ${vcell(p["Состояние автомата коррекции"], "st-muted")}
            ${lcell("Плановое ΔV, мм/с")}
            ${vcell(p["Плановое ΔV, мм/с"], "st-muted")}
            ${lcell("Фактическое ΔV, мм/с")}
            ${vcell(p["Фактическое ΔV, мм/с"], "st-muted")}
          </tr>
        </table>

        <div class="egy-footnote">
          <span class="mono">Назначение формата:</span> отображение фактических навигационных данных СУДН и признаков подготовки/выполнения коррекции орбиты.
        </div>
      </div>
    </div>
  `;
}

function renderGncControl(ctx){
  const { sat } = ctx;
  const sub = sat?.subsystems?.gnc;
  const p = sub?.params || {};
  const th = TH.gnc;
  const c = classes(ctx);
  const st = sat?.inactive ? "inactive" : (sub?.st || "warn");
  const msg = sub?.msg || "—";
  const ageTmi = Date.now() - (sat?.lastUpdateMs || 0);

  const actionOverall =
    st === "ok" ? "штатный контроль" :
    st === "warn" ? "проверить источник навигации, валидность измерений и готовность коррекции" :
    st === "alarm" ? "запретить коррекцию орбиты до восстановления навигационного решения" :
    "ожидать ввода КА в эксплуатацию";

  const rows = [
    checkRow(
      "Качество ТМИ СУДН",
      c.tmi === "st-ok" ? "достоверна" : ageTmi + " мс",
      `предупреждение >${th.NAV_AGE_WARN_MS} мс; авария >${th.NAV_AGE_ALARM_MS} мс`,
      c.tmi,
      c.tmi === "st-ok" ? "данные пригодны для контроля" : "ТМИ СУДН устарела или отсутствует",
      c.tmi === "st-ok" ? "продолжить контроль" : "проверить ТМ/КИ и повторить получение ТМИ"
    ),
    checkRow(
      "Готовность навигационного решения",
      p["Готовность навигационного решения"],
      "готово — норма; ограничено — предупреждение; не готово — авария",
      c.ready,
      c.ready === "st-ok" ? "решение готово" : c.ready === "st-warn" ? "решение ограниченно пригодно" : "решение не готово",
      c.ready === "st-ok" ? "действий не требуется" : "запретить/отложить коррекцию до восстановления навигации"
    ),
    checkRow(
      "Валидные навигационные измерения",
      p["Валидные навигационные измерения, шт"],
      `норма ≥${th.VALID_NAV_MEAS_OK_MIN}; предупреждение ${th.VALID_NAV_MEAS_WARN_MIN}…${th.VALID_NAV_MEAS_OK_MIN}; авария <${th.VALID_NAV_MEAS_WARN_MIN}`,
      c.meas,
      c.meas === "st-ok" ? "измерений достаточно" : c.meas === "st-warn" ? "число валидных измерений снижено" : "измерений недостаточно",
      c.meas === "st-ok" ? "действий не требуется" : "проверить источник ГНСС/ИНС и исключить недостоверные измерения"
    ),
    checkRow(
      "СКО положения",
      `${safe(p["СКО положения, м"])} м`,
      `норма ≤${th.POS_SIGMA_OK_MAX_M}; предупреждение ${th.POS_SIGMA_OK_MAX_M}…${th.POS_SIGMA_ALARM_MAX_M}; авария >${th.POS_SIGMA_ALARM_MAX_M}`,
      c.pos,
      c.pos === "st-ok" ? "точность положения допустима" : c.pos === "st-warn" ? "точность положения снижена" : "точность положения недопустима",
      c.pos === "st-ok" ? "действий не требуется" : "уточнить навигационное решение перед коррекцией"
    ),
    checkRow(
      "СКО скорости",
      `${safe(p["СКО скорости, м/с"])} м/с`,
      `норма ≤${th.VEL_SIGMA_OK_MAX_MS}; предупреждение ${th.VEL_SIGMA_OK_MAX_MS}…${th.VEL_SIGMA_ALARM_MAX_MS}; авария >${th.VEL_SIGMA_ALARM_MAX_MS}`,
      c.vel,
      c.vel === "st-ok" ? "точность скорости допустима" : c.vel === "st-warn" ? "точность скорости снижена" : "точность скорости недопустима",
      c.vel === "st-ok" ? "действий не требуется" : "повторить оценку орбиты"
    ),
    checkRow(
      "Возраст навигационного решения",
      `${safe(p["Возраст навигационного решения, мс"])} мс`,
      `предупреждение >${th.NAV_AGE_WARN_MS}; авария >${th.NAV_AGE_ALARM_MS}`,
      c.navAge,
      c.navAge === "st-ok" ? "решение актуально" : c.navAge === "st-warn" ? "решение стареет" : "решение устарело",
      c.navAge === "st-ok" ? "действий не требуется" : "обновить навигационное решение"
    ),
    checkRow(
      "Расхождение ΔV",
      `${safe(p["Расхождение ΔV, мм/с"])} мм/с`,
      `норма ≤${th.DV_WARN_MMS}; предупреждение ${th.DV_WARN_MMS}…${th.DV_ALARM_MMS}; авария >${th.DV_ALARM_MMS}`,
      c.dv,
      c.dv === "st-ok" ? "манёвр соответствует плану" : c.dv === "st-warn" ? "есть расхождение план/факт" : "расхождение ΔV недопустимо",
      c.dv === "st-ok" ? "действий не требуется" : "проверить расчёт манёвра и состояние ДУ"
    ),
    checkRow(
      "Разрешение коррекции",
      p["Разрешение коррекции"],
      "при неготовой навигации коррекция должна быть запрещена",
      c.permit,
      c.permit === "st-ok" ? "коррекция разрешена или не требуется" : "коррекция запрещена",
      c.permit === "st-ok" ? "действий не требуется" : "не выполнять манёвр до снятия запрета"
    )
  ].join("");

  return `
    <div class="egyfmt">
      ${egyptHeader(ctx, "Контроль состояния")}

      <div class="egy-sheet">
        <table class="egy-table" cellspacing="0" cellpadding="0">
          <tr>
            <td class="egytd-top" colspan="6">Итоговая оценка СУДН — навигация</td>
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
          <span class="mono">Назначение формата:</span> оценка пригодности навигационного решения для управления орбитальным движением и коррекции орбиты.
        </div>
      </div>
    </div>
  `;
}

function renderGncManeuver(ctx){
  const { sat } = ctx;
  const p = sat?.subsystems?.gnc?.params || {};
  const th = TH.gnc;
  const c = classes(ctx);

  return `
    <div class="egyfmt">
      ${egyptHeader(ctx, "Манёвр и коррекция")}

      <div class="egy-grid">
        <div class="egy-box">
          <div class="egy-box-h">Автомат коррекции орбиты</div>
          ${cell("Флаг коррекции орбиты", p["Флаг коррекции орбиты"], c.flag)}
          ${cell("Тип коррекции", p["Тип коррекции"], "st-muted")}
          ${cell("Манёвр коррекции", p["Манёвр коррекции"], c.maneuver)}
          ${cell("Состояние автомата коррекции", p["Состояние автомата коррекции"], "st-muted")}
          ${cell("Разрешение коррекции", p["Разрешение коррекции"], c.permit)}
        </div>

        <div class="egy-box">
          <div class="egy-box-h">Время и ΔV</div>
          ${cell("Таймер до манёвра, с", p["Таймер до манёвра, с"], "st-muted")}
          ${cell("Таймер после манёвра, с", p["Таймер после манёвра, с"], "st-muted")}
          ${cell("Плановое ΔV, мм/с", p["Плановое ΔV, мм/с"], "st-muted")}
          ${cell("Фактическое ΔV, мм/с", p["Фактическое ΔV, мм/с"], "st-muted")}
          ${cell("Расхождение ΔV, мм/с", p["Расхождение ΔV, мм/с"], c.dv)}
        </div>

        <div class="egy-box" style="grid-column:1 / -1;">
          <div class="egy-box-h">Таблица переходов автомата коррекции</div>
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
              <tr><td>ожидание</td><td>флаг коррекции отсутствует</td><td>получен флаг коррекции или задан таймер до манёвра</td><td>штатный навигационный контроль</td></tr>
              <tr><td>запланирована</td><td>флаг коррекции есть, манёвр ещё не выполняется</td><td>начало манёвра или отмена коррекции</td><td>контроль готовности навигации и ДУ</td></tr>
              <tr><td>выполнение</td><td>манёвр коррекции идёт</td><td>завершение манёвра или таймаут</td><td>контроль ΔV и времени выполнения</td></tr>
              <tr><td>постконтроль</td><td>манёвр завершён, идёт оценка результата</td><td>подтверждена фактическая коррекция</td><td>сравнение планового и фактического ΔV</td></tr>
            </tbody>
          </table>
        </div>

        <div class="egy-box" style="grid-column:1 / -1;">
          <div class="egy-box-h">Критерии контроля коррекции</div>
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
              ${rowCrit("Расхождение ΔV, мм/с", p["Расхождение ΔV, мм/с"], `≤ ${th.DV_WARN_MMS}`, `${th.DV_WARN_MMS}…${th.DV_ALARM_MMS}`, `> ${th.DV_ALARM_MMS}`)}
              ${rowCrit("Время выполнения манёвра, с", "по автомату", `≤ ${th.MANEUVER_ACTIVE_TIMEOUT_S}`, "—", `> ${th.MANEUVER_ACTIVE_TIMEOUT_S}`)}
              ${rowCrit("Готовность навигации", p["Готовность навигационного решения"], "готово", "ограничено", "не готово")}
              ${rowCrit("Валидные измерения, шт", p["Валидные навигационные измерения, шт"], `≥ ${th.VALID_NAV_MEAS_OK_MIN}`, `${th.VALID_NAV_MEAS_WARN_MIN}…${th.VALID_NAV_MEAS_OK_MIN}`, `< ${th.VALID_NAV_MEAS_WARN_MIN}`)}
            </tbody>
          </table>
        </div>

        <div class="egy-box" style="grid-column:1 / -1;">
          <div class="egy-note">
            <div class="egy-note-row"><b>Условие разрешения коррекции:</b> навигационное решение готово, валидных измерений достаточно, возраст данных допустим.</div>
            <div class="egy-note-row"><b>Запрет коррекции:</b> навигация не готова, данные устарели, расхождение ΔV превысило аварийный порог или манёвр превысил допустимое время.</div>
            <div class="egy-note-row"><b>Связь с ДУ:</b> навигационный контур формирует/контролирует признаки коррекции, а фактическое включение исполнительной части проверяется в разделе ДУ.</div>
          </div>
        </div>
      </div>
    </div>
  `;
}
