import { escapeHtml } from "../../core/util.js";
import { TH } from "../../model/thresholds.js";

function badgeClass(st){
  return st==="ok" ? "st-ok" : st==="warn" ? "st-warn" : st==="alarm" ? "st-alarm" : "st-inactive";
}
function stWord(st){
  return st==="ok" ? "норма" : st==="warn" ? "предупреждение" : st==="alarm" ? "авария" : "не в эксплуатации";
}

function num(v){
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function fmt(v, digits=1){
  const n=num(v);
  return n==null ? "—" : n.toFixed(digits);
}

function clsLowHigh(v, warnMin, okMin, okMax, warnMax){
  const n=num(v);
  if(n==null) return "st-muted";
  if(n < warnMin || n > warnMax) return "st-alarm";
  if(n < okMin || n > okMax) return "st-warn";
  return "st-ok";
}

function clsMin(v, warnMin, okMin){
  const n=num(v);
  if(n==null) return "st-muted";
  if(n < warnMin) return "st-alarm";
  if(n < okMin) return "st-warn";
  return "st-ok";
}

function clsPbal(v, illum){
  const n=num(v);
  if(n==null) return "st-muted";
  const s = String(illum || "").toUpperCase();
  const inShadow = s.includes("ЗАТМ") || s.includes("ТЕНЬ");
  if(n < 0 && !inShadow) return "st-alarm";
  if(n >= 0 && n < TH.eps.P_BAL_NEAR_ZERO_W) return "st-warn";
  return "st-ok";
}

function isYes(v){
  const s = String(v || "").trim().toLowerCase();
  return s === "да" || s === "есть" || s === "сработала" || s === "отключена";
}

export function renderDetailEPS(ctx){
  return renderEpsCurrent(ctx);
}

export function renderDetailEPS_Control(ctx){
  return renderEpsControl(ctx);
}

export function renderDetailEPS_Current(ctx){
  return renderEpsCurrent(ctx);
}

export function renderDetailEPS_U(ctx){
  return renderEpsU(ctx);
}

export function renderDetailEPS_SoC(ctx){
  return renderEpsSoc(ctx);
}

function egyptHeader(ctx, title){
  const { satNo, sat } = ctx;
  const sub = sat?.subsystems?.eps;
  const st = sat?.inactive ? "inactive" : (sub?.st || "warn");

  const ageMs = Date.now() - (sat?.lastUpdateMs || 0);
  const qualityOk = (sat?.link==="ok" && ageMs<=8000);
  const quality = qualityOk ? "достоверна" : "нет достоверной ТМИ";
  const qCls = qualityOk ? "st-ok" : "st-alarm";

  const p = sub?.params || {};
  const mode  = p["Режим СЭС"] || "—";
  const illum = p["Режим освещённости"] || "—";

  return `
    <div class="egy-top">
      <div class="egy-title mono">[КА "${escapeHtml(String(satNo))}"] СЭС: ${escapeHtml(title)}</div>
      <div class="egy-line">
        <span class="badge ${badgeClass(st)}">${escapeHtml(stWord(st))}</span>
        <span class="chip ${qCls}">ТМИ: ${escapeHtml(quality)}</span>
        <span class="chip st-muted">ВО: <span class="mono">${escapeHtml(sat?.lastUpdate || "—")}</span></span>
        <span class="chip st-muted">Режим: <span class="mono">${escapeHtml(String(mode))}</span></span>
        <span class="chip st-muted">Освещ.: <span class="mono">${escapeHtml(String(illum))}</span></span>

        <span class="egy-sep"></span>

        <button class="btn-mini" data-open-sub="eps_current" data-open-title="СЭС: Текущее состояние">Текущее состояние</button>
        <button class="btn-mini" data-open-sub="eps_control" data-open-title="СЭС: Контроль состояния">Контроль состояния</button>
        <button class="btn-mini" data-open-sub="eps_u" data-open-title="СЭС: Контроль напряжения АКБ">Напряжение АКБ</button>
        <button class="btn-mini" data-open-sub="eps_soc" data-open-title="СЭС: График СЗ АКБ">График СЗ АКБ</button>
      </div>
    </div>
  `;
}

function cell(label, value, cls="st-muted", hint=""){
  return `
    <div class="egy-row">
      <div class="egy-lbl">${escapeHtml(label)}</div>
      <div class="egy-val ${cls}" title="${escapeHtml(hint)}">${escapeHtml(value)}</div>
    </div>
  `;
}

function sparkline(vals){
  const arr = (vals||[]).filter(v=>Number.isFinite(v));
  if(arr.length<2) return `<div class="egy-spark muted">—</div>`;
  const w=240, h=48, pad=3;
  const min=Math.min(...arr), max=Math.max(...arr);
  const span=(max-min)||1;
  const pts = arr.map((v,i)=>{
    const x = pad + (w-2*pad) * (i/(arr.length-1));
    const y = pad + (h-2*pad) * (1 - ((v-min)/span));
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return `
    <svg class="egy-spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-label="sparkline">
      <polyline fill="none" stroke="currentColor" stroke-width="2" points="${pts}"></polyline>
    </svg>
  `;
}

function vcell(value, cls="st-muted", opts=""){
  return `<td class="egytd-val ${cls}" ${opts}>${escapeHtml(value)}</td>`;
}
function lcell(text, opts=""){
  return `<td class="egytd-lbl" ${opts}>${escapeHtml(text)}</td>`;
}

function resultWord(cls){
  if(cls === "st-ok") return "норма";
  if(cls === "st-warn") return "предупреждение";
  if(cls === "st-alarm") return "авария";
  return "не определено";
}

function checkRow(name, value, criterion, cls, reason, action){
  return `
    <tr>
      <td class="egytd-lbl">${escapeHtml(name)}</td>
      <td class="egytd-val st-muted">${escapeHtml(value)}</td>
      <td class="egytd-val st-muted">${escapeHtml(criterion)}</td>
      <td class="egytd-val ${cls}">${escapeHtml(resultWord(cls))}</td>
      <td class="egytd-val st-muted">${escapeHtml(reason)}</td>
      <td class="egytd-val st-muted">${escapeHtml(action)}</td>
    </tr>
  `;
}

function renderEpsControl(ctx){
  const { sat } = ctx;
  const sub = sat?.subsystems?.eps;
  const p = sub?.params || {};
  const th = TH.eps;

  const U  = p["Uш, В"];
  const sz = p["СЗ АКБ, %"];
  const tb = p["TАКБ, °C"];
  const Pb = p["Pбал, Вт"];
  const illum = p["Режим освещённости"];
  const prot = p["Защита АКБ"];
  const off = p["АКБ отключена"];
  const loadOff = p["Отключение нагрузки"];

  const uCls = clsLowHigh(U, th.U_BUS_WARN_MIN_V, th.U_BUS_OK_MIN_V, th.U_BUS_OK_MAX_V, th.U_BUS_WARN_MAX_V);
  const szCls = clsMin(sz, th.SZ_AKB_WARN_MIN_PCT, th.SZ_AKB_OK_MIN_PCT);
  const tCls = clsLowHigh(tb, th.T_AKB_WARN_MIN_C, th.T_AKB_OK_MIN_C, th.T_AKB_OK_MAX_C, th.T_AKB_WARN_MAX_C);
  const balCls = clsPbal(Pb, illum);

  const protCls = isYes(prot) ? "st-alarm" : "st-ok";
  const offCls = isYes(off) ? "st-alarm" : "st-ok";
  const loadCls = isYes(loadOff) ? "st-alarm" : "st-ok";

  const st = sat?.inactive ? "inactive" : (sub?.st || "warn");
  const msg = sub?.msg || "—";

  const ageMs = Date.now() - (sat?.lastUpdateMs || 0);
  const tmiOk = sat?.link === "ok" && ageMs <= 8000;
  const tmiCls = tmiOk ? "st-ok" : "st-alarm";
  const tmiValue = tmiOk ? "достоверна" : "нет достоверной ТМИ";

  const inShadow = String(illum || "").toUpperCase().includes("ЗАТМ") || String(illum || "").toUpperCase().includes("ТЕНЬ");

  const uReason =
    uCls === "st-ok" ? "напряжение шины в рабочем диапазоне" :
    uCls === "st-warn" ? "напряжение шины вышло из нормы, но не достигло аварийного допуска" :
    "напряжение шины вне аварийного допуска";

  const szReason =
    szCls === "st-ok" ? "энергетический запас АКБ достаточен" :
    szCls === "st-warn" ? "снижение энергетического запаса АКБ" :
    "недопустимо низкая степень заряда АКБ";

  const tReason =
    tCls === "st-ok" ? "температура АКБ в допустимом диапазоне" :
    tCls === "st-warn" ? "температура АКБ вышла из нормы, требуется контроль тренда" :
    "температура АКБ вне аварийного допуска";

  const balReason =
    balCls === "st-ok" ? (inShadow ? "отрицательный баланс допустим в затмении при контроле СЗ АКБ" : "энергобаланс положительный") :
    balCls === "st-warn" ? "малый запас энергобаланса" :
    "отрицательный энергобаланс вне затмения";

  const actionOverall =
    st === "ok" ? "штатный контроль" :
    st === "warn" ? "усилить контроль СЭС, проверить тренд СЗ АКБ и Pбал" :
    st === "alarm" ? "ограничить нагрузку БРК/АФУ, проверить защиту АКБ и канал ТМИ" :
    "ожидать ввода КА в эксплуатацию";

  const rows = [
    checkRow(
      "Качество ТМИ СЭС",
      tmiValue,
      "связь с КА есть, данные актуальны",
      tmiCls,
      tmiOk ? "данные пригодны для контроля" : "данные нельзя использовать как достоверные",
      tmiOk ? "продолжить контроль" : "проверить канал ТМ/КИ и повторить получение ТМИ"
    ),
    checkRow(
      "Напряжение шины питания",
      `${fmt(U,2)} В`,
      "норма 27…29 В; предупреждение 25…27 / 29…30 В; авария <25 / >30 В",
      uCls,
      uReason,
      uCls === "st-ok" ? "действий не требуется" : uCls === "st-warn" ? "проверить нагрузку и Pбал" : "ограничить нагрузку, проверить СЭС"
    ),
    checkRow(
      "Степень заряда АКБ",
      `${fmt(sz,0)} %`,
      "норма ≥60%; предупреждение 30…60%; авария <30%",
      szCls,
      szReason,
      szCls === "st-ok" ? "действий не требуется" : szCls === "st-warn" ? "ограничить необязательную нагрузку при ухудшении тренда" : "перевести КА в энергосберегающий режим"
    ),
    checkRow(
      "Температура АКБ",
      `${fmt(tb,1)} °C`,
      "норма 0…30 °C; предупреждение -10…0 / 30…40 °C; авария <-10 / >40 °C",
      tCls,
      tReason,
      tCls === "st-ok" ? "действий не требуется" : tCls === "st-warn" ? "проверить тепловой режим АКБ" : "ограничить режимы, проверить СОТР/нагрев"
    ),
    checkRow(
      "Баланс мощности",
      `${fmt(Pb,0)} Вт`,
      "Pбал = Pген − Pнаг; вне тени Pбал должен быть ≥0; в затмении разряд допустим",
      balCls,
      balReason,
      balCls === "st-ok" ? "действий не требуется" : balCls === "st-warn" ? "контролировать запас мощности" : "ограничить нагрузку БРК/АФУ"
    ),
    checkRow(
      "Защита АКБ",
      String(prot || "—"),
      "срабатывание защиты = аварийный признак",
      protCls,
      isYes(prot) ? "защита АКБ сработала" : "защита АКБ не сработала",
      isYes(prot) ? "проверить причину защиты и запретить наращивание нагрузки" : "действий не требуется"
    ),
    checkRow(
      "Отключение АКБ",
      String(off || "—"),
      "отключение АКБ = аварийный признак",
      offCls,
      isYes(off) ? "АКБ отключена от шины питания" : "АКБ подключена",
      isYes(off) ? "перевести КА в безопасный энергорежим" : "действий не требуется"
    ),
    checkRow(
      "Отключение нагрузки",
      String(loadOff || "—"),
      "факт отключения нагрузки = аварийное событие",
      loadCls,
      isYes(loadOff) ? "нагрузка отключалась алгоритмом защиты" : "отключение нагрузки не зафиксировано",
      isYes(loadOff) ? "проверить состав отключённой нагрузки и восстановление питания" : "действий не требуется"
    )
  ].join("");

  return `
    <div class="egyfmt">
      ${egyptHeader(ctx, "Контроль состояния")}

      <div class="egy-sheet">
        <table class="egy-table" cellspacing="0" cellpadding="0">
          <tr>
            <td class="egytd-top" colspan="6">Итоговая оценка состояния СЭС</td>
          </tr>
          <tr>
            ${lcell("Итоговое состояние", `colspan="1"`)}
            ${vcell(stWord(st), badgeClass(st), `colspan="1"`)}
            ${lcell("Причина", `colspan="1"`)}
            ${vcell(String(msg), badgeClass(st), `colspan="1"`)}
            ${lcell("Действие оператора", `colspan="1"`)}
            ${vcell(actionOverall, "st-muted", `colspan="1"`)}
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
          <span class="mono">Назначение формата:</span> не отображение сырых значений, а объяснение, почему СЭС получила состояние «норма», «предупреждение» или «авария».
        </div>
      </div>
    </div>
  `;
}

function renderEpsCurrent(ctx){
  const { sat } = ctx;
  const sub = sat?.subsystems?.eps;
  const p = sub?.params || {};

  const U  = p["Uш, В"];
  const I  = p["Iн, А"];
  const Pg = p["Pген, Вт"];
  const Pl = p["Pнаг, Вт"];
  const Pb = p["Pбал, Вт"];

  const sz = p["СЗ АКБ, %"];
  const ub = p["UАКБ, В"];
  const ib = p["IАКБ, А"];
  const tb = p["TАКБ, °C"];

  const mode = p["Режим СЭС"] || "—";
  const illum = p["Режим освещённости"] || "—";
  const prot = p["Защита АКБ"] || "—";
  const off = p["АКБ отключена"] || "—";
  const loadOff = p["Отключение нагрузки"] || "—";

  return `
    <div class="egyfmt">
      ${egyptHeader(ctx, "Текущее состояние")}

      <div class="egy-sheet">
        <table class="egy-table" cellspacing="0" cellpadding="0">
          <tr>
            <td class="egytd-top" colspan="8">Текущие параметры СЭС</td>
          </tr>

          <tr>
            <td class="egytd-sec" colspan="8">Режимы и условия работы</td>
          </tr>
          <tr>
            ${lcell("Режим СЭС")}
            ${vcell(String(mode), "st-muted", `colspan="3"`)}
            ${lcell("Режим освещённости")}
            ${vcell(String(illum), "st-muted", `colspan="3"`)}
          </tr>

          <tr>
            <td class="egytd-sec" colspan="8">Шина питания, генерация и нагрузка</td>
          </tr>
          <tr>
            ${lcell("Uш, В")}
            ${vcell(fmt(U,2), "st-muted")}
            ${lcell("Iн, А")}
            ${vcell(fmt(I,2), "st-muted")}
            ${lcell("Pген, Вт")}
            ${vcell(fmt(Pg,0), "st-muted")}
            ${lcell("Pнаг, Вт")}
            ${vcell(fmt(Pl,0), "st-muted")}
          </tr>
          <tr>
            ${lcell("Pбал, Вт")}
            ${vcell(fmt(Pb,0), "st-muted")}
            ${lcell("Расчёт Pбал")}
            ${vcell("Pген − Pнаг", "st-muted", `colspan="5"`)}
          </tr>

          <tr>
            <td class="egytd-sec" colspan="8">Аккумуляторная батарея</td>
          </tr>
          <tr>
            ${lcell("СЗ АКБ, %")}
            ${vcell(fmt(sz,0), "st-muted")}
            ${lcell("UАКБ, В")}
            ${vcell(fmt(ub,2), "st-muted")}
            ${lcell("IАКБ, А")}
            ${vcell(fmt(ib,2), "st-muted")}
            ${lcell("TАКБ, °C")}
            ${vcell(fmt(tb,1), "st-muted")}
          </tr>
          <tr>
            ${lcell("Состав АКБ")}
            ${vcell("1 АКБ Li-ion", "st-muted")}
            ${lcell("Ёмкость АКБ")}
            ${vcell("порядка 20 А·ч", "st-muted")}
            ${lcell("Источник")}
            ${vcell("ВКР, состав КА ГЕОИД-150", "st-muted", `colspan="3"`)}
          </tr>

          <tr>
            <td class="egytd-sec" colspan="8">Дискретные признаки и события</td>
          </tr>
          <tr>
            ${lcell("Защита АКБ")}
            ${vcell(String(prot), isYes(prot) ? "st-alarm" : "st-muted")}
            ${lcell("АКБ отключена")}
            ${vcell(String(off), isYes(off) ? "st-alarm" : "st-muted")}
            ${lcell("Отключение нагрузки")}
            ${vcell(String(loadOff), isYes(loadOff) ? "st-alarm" : "st-muted", `colspan="3"`)}
          </tr>
        </table>

        <div class="egy-footnote">
          <span class="mono">Назначение формата:</span> отображение фактических текущих значений СЭС без принятия эксплуатационного решения. Оценка этих значений вынесена в формат «Контроль состояния».
        </div>
      </div>
    </div>
  `;
}

function renderEpsU(ctx){
  const { sat } = ctx;
  const p = sat?.subsystems?.eps?.params || {};
  const head = egyptHeader(ctx, "Контроль напряжения АКБ");

  return `
    <div class="egyfmt">
      ${head}

      <div class="egy-grid">
        <div class="egy-box">
          <div class="egy-box-h">Аккумуляторная батарея</div>
          ${cell("UАКБ, В", fmt(p["UАКБ, В"],2), "st-muted")}
          ${cell("IАКБ, А", fmt(p["IАКБ, А"],2), "st-muted")}
          ${cell("TАКБ, °C", fmt(p["TАКБ, °C"],1), clsLowHigh(p["TАКБ, °C"], TH.eps.T_AKB_WARN_MIN_C, TH.eps.T_AKB_OK_MIN_C, TH.eps.T_AKB_OK_MAX_C, TH.eps.T_AKB_WARN_MAX_C))}
          ${cell("АКБ отключена", String(p["АКБ отключена"]||"—"), isYes(p["АКБ отключена"])?"st-alarm":"st-ok")}
        </div>

        <div class="egy-box">
          <div class="egy-box-h">Принято в модели</div>
          ${cell("Тип", "Li-ion", "st-muted")}
          ${cell("Количество", "1 АКБ", "st-muted")}
          ${cell("Ёмкость", "порядка 20 А·ч", "st-muted")}
          ${cell("Источник", "ВКР, таблица состава КА", "st-muted")}
        </div>
      </div>
    </div>
  `;
}

function renderEpsSoc(ctx){
  const { sat } = ctx;
  const eps = sat?.subsystems?.eps;
  const h = eps?.hist || {};
  const head = egyptHeader(ctx, "График СЗ АКБ");

  const szLine = sparkline(h.sz);
  const last = (h.sz && h.sz.length) ? h.sz[h.sz.length-1] : null;

  return `
    <div class="egyfmt">
      ${head}

      <div class="egy-grid">
        <div class="egy-box" style="grid-column:1 / -1;">
          <div class="egy-box-h">СЗ АКБ, %</div>
          <div class="egy-spark-wrap">${szLine}</div>
          <div class="egy-foot">Текущее: <span class="mono">${last==null?"—":Math.round(last)}</span> %</div>
        </div>

        <div class="egy-box" style="grid-column:1 / -1;">
          <div class="egy-note">
            <div class="egy-note-row">График показывает изменение степени заряда аккумуляторной батареи, принятой в составе СЭС КА «ГЕОИД-150» как одна АКБ Li-ion порядка 20 А·ч.</div>
          </div>
        </div>
      </div>
    </div>
  `;
}
