import { escapeHtml } from "../../core/util.js";
import { TH } from "../../model/thresholds.js";
import { satNeighborForward, satNeighborBackward } from "../../model/constell.js";

function badgeClass(st){
  return st === "ok" ? "st-ok" : st === "warn" ? "st-warn" : st === "alarm" ? "st-alarm" : "st-inactive";
}

function stWord(st){
  return st === "ok" ? "норма" : st === "warn" ? "предупреждение" : st === "alarm" ? "авария" : "не в эксплуатации";
}

function chWord(st){
  return st === "ok" ? "норма" : st === "warn" ? "предупреждение" : st === "alarm" ? "авария" : "не определено";
}

function safe(v){
  return v == null || v === "" ? "—" : String(v);
}

function mssTh(){
  const x = TH?.mss || {};
  return {
    DELAY_WARN_MS: x.DELAY_WARN_MS ?? 80,
    DELAY_ALARM_MS: x.DELAY_ALARM_MS ?? 180,
    RETRY_WARN_MAX: x.RETRY_WARN_MAX ?? 4,
    RETRY_ALARM_MAX: x.RETRY_ALARM_MAX ?? 10,
    LOSS_WARN_MAX: x.LOSS_WARN_MAX ?? 2,
    LOSS_ALARM_MAX: x.LOSS_ALARM_MAX ?? 6,
    TRANSIT_AGE_WARN_MS: x.TRANSIT_AGE_WARN_MS ?? 5000,
    TRANSIT_AGE_ALARM_MS: x.TRANSIT_AGE_ALARM_MS ?? 8000,
    TIME_SOURCE: x.TIME_SOURCE ?? "БШВ / транзитная временная метка",
    UV_HINT: x.UV_HINT ?? "проверка маршрута МСС, повтор захвата соседнего КА, исключение неисправного направления"
  };
}

function egyptHeader(ctx, title){
  const { satNo, sat } = ctx;
  const sub = sat?.subsystems?.mss;
  const st = sat?.inactive ? "inactive" : (sub?.st || "warn");
  const th = mssTh();

  const ageMs = Date.now() - (sat?.lastUpdateMs || 0);
  const qualityOk = (sat?.link === "ok" && ageMs <= th.TRANSIT_AGE_ALARM_MS);
  const quality = qualityOk ? "достоверна" : "нет достоверной ТМИ";
  const qCls = qualityOk ? "st-ok" : "st-alarm";

  const role = sat?.role === "node" ? "узловой" : "обычный";

  return `
    <div class="egy-top">
      <div class="egy-title mono">[КА "${escapeHtml(String(satNo))}"] МСС: ${escapeHtml(title)}</div>

      <div class="egy-line">
        <span class="badge ${badgeClass(st)}">${escapeHtml(stWord(st))}</span>
        <span class="chip ${qCls}">ТМИ: ${escapeHtml(quality)}</span>
        <span class="chip st-muted">ВО: <span class="mono">${escapeHtml(sat?.lastUpdate || "—")}</span></span>
        <span class="chip st-muted">Роль: <span class="mono">${escapeHtml(role)}</span></span>

        <span class="egy-sep"></span>

        <button class="btn-mini" data-open-sub="mss_current" data-open-title="МСС: Текущее состояние">Текущее состояние</button>
        <button class="btn-mini" data-open-sub="mss_control" data-open-title="МСС: Контроль состояния">Контроль состояния</button>
        <button class="btn-mini" data-open-sub="mss_links" data-open-title="МСС: Каналы вперёд и назад">Каналы вперёд и назад</button>
      </div>
    </div>
  `;
}

function cell(label, value, cls = "st-muted", hint = ""){
  return `
    <div class="egy-row">
      <div class="egy-lbl">${escapeHtml(label)}</div>
      <div class="egy-val ${cls}" title="${escapeHtml(hint)}">${escapeHtml(safe(value))}</div>
    </div>
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

export function renderDetailMSS(ctx){
  return renderMssCurrent(ctx);
}

export function renderDetailMSS_Control(ctx){
  return renderMssControl(ctx);
}

export function renderDetailMSS_Current(ctx){
  return renderMssCurrent(ctx);
}

export function renderDetailMSS_Links(ctx){
  return renderMssLinks(ctx);
}

function renderMssControl(ctx){
  const { satNo, sat } = ctx;
  const sub = sat?.subsystems?.mss;
  const p = sub?.params || {};
  const th = mssTh();

  const fwd = sub?._detail?.forward || { st: "warn", msg: "—" };
  const back = sub?._detail?.backward || { st: "warn", msg: "—" };

  const neighF = satNeighborForward(satNo);
  const neighB = satNeighborBackward(satNo);

  const ageTransit = Number(p["Возраст транзитной ТМИ, мс"]);
  const ageCls = !Number.isFinite(ageTransit)
    ? "st-muted"
    : ageTransit > th.TRANSIT_AGE_ALARM_MS
      ? "st-alarm"
      : ageTransit > th.TRANSIT_AGE_WARN_MS
        ? "st-warn"
        : "st-ok";

  const route = String(p["Нарушение маршрутизации"] || "нет").trim().toLowerCase();
  const routeCls = route === "да" || route === "есть" || route === "нарушена" ? "st-alarm" : "st-ok";

  function vcell(value, cls = "st-muted", opts = ""){
    return `<td class="egytd-val ${cls}" ${opts}>${escapeHtml(safe(value))}</td>`;
  }

  function lcell(text, opts = ""){
    return `<td class="egytd-lbl" ${opts}>${escapeHtml(text)}</td>`;
  }

  return `
    <div class="egyfmt">
      ${egyptHeader(ctx, "Контроль состояния")}

      <div class="egy-sheet">
        <table class="egy-table" cellspacing="0" cellpadding="0">
          <tr>
            <td class="egytd-top" colspan="8">МСС — контроль состояния</td>
          </tr>

          <tr>
            <td class="egytd-sec" colspan="4">Канал вперёд</td>
            <td class="egytd-sec" colspan="4">Канал назад</td>
          </tr>

          <tr>
            ${lcell("Соседний КА")}${vcell(neighF, "st-muted")}
            ${lcell("Статус канала")}${vcell(chWord(fwd.st), badgeClass(fwd.st))}
            ${lcell("Соседний КА")}${vcell(neighB, "st-muted")}
            ${lcell("Статус канала")}${vcell(chWord(back.st), badgeClass(back.st))}
          </tr>

          <tr>
            ${lcell("Терминал готов")}${vcell(
              p["Терминал вперёд"],
              String(p["Терминал вперёд"] || "готов").toLowerCase() === "готов" ? "st-ok" : "st-alarm"
            )}
            ${lcell("Захват")}${vcell(
              p["Захват вперёд"],
              String(p["Захват вперёд"] || "захват установлен").toLowerCase() === "захват установлен"
                ? "st-ok"
                : String(p["Захват вперёд"] || "захват установлен").toLowerCase() === "поиск"
                  ? "st-warn"
                  : "st-alarm"
            )}
            ${lcell("Терминал готов")}${vcell(
              p["Терминал назад"],
              String(p["Терминал назад"] || "готов").toLowerCase() === "готов" ? "st-ok" : "st-alarm"
            )}
            ${lcell("Захват")}${vcell(
              p["Захват назад"],
              String(p["Захват назад"] || "захват установлен").toLowerCase() === "захват установлен"
                ? "st-ok"
                : String(p["Захват назад"] || "захват установлен").toLowerCase() === "поиск"
                  ? "st-warn"
                  : "st-alarm"
            )}
          </tr>

          <tr>
            ${lcell("Задержка, мс")}${vcell(
              p["Задержка вперёд, мс"],
              Number(p["Задержка вперёд, мс"]) >= th.DELAY_ALARM_MS
                ? "st-alarm"
                : Number(p["Задержка вперёд, мс"]) >= th.DELAY_WARN_MS
                  ? "st-warn"
                  : "st-ok"
            )}
            ${lcell("Потери/повторы")}${vcell(
              `${safe(p["Потери пакетов вперёд, шт"])} / ${safe(p["Повторы вперёд, шт"])}`,
              "st-muted"
            )}
            ${lcell("Задержка, мс")}${vcell(
              p["Задержка назад, мс"],
              Number(p["Задержка назад, мс"]) >= th.DELAY_ALARM_MS
                ? "st-alarm"
                : Number(p["Задержка назад, мс"]) >= th.DELAY_WARN_MS
                  ? "st-warn"
                  : "st-ok"
            )}
            ${lcell("Потери/повторы")}${vcell(
              `${safe(p["Потери пакетов назад, шт"])} / ${safe(p["Повторы назад, шт"])}`,
              "st-muted"
            )}
          </tr>

          <tr>
            ${lcell("Возраст транзитной ТМИ, мс")}${vcell(ageTransit, ageCls)}
            ${lcell("Маршрутизация")}${vcell(route, routeCls)}
            ${lcell("Транзит ТМ/КИ через КА, кбит/с")}${vcell(p["Транзит ТМ/КИ через КА, кбит/с"], "st-muted")}
            ${lcell("Сводный статус")}${vcell(stWord(sub?.st || "warn"), badgeClass(sub?.st || "warn"))}
          </tr>
        </table>

        <div class="egy-footnote">
          <span class="mono">Логика:</span> МСС работает только внутри одной плоскости и имеет два направления:
          вперёд и назад по плоскости. Любой КА может быть узловым, но аппаратно все КА одинаковы.
        </div>
      </div>

      <div class="egy-box">
        <div class="egy-box-h">Критерии контроля (формализовано)</div>
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
            ${rowCrit("Задержка вперёд, мс", p["Задержка вперёд, мс"], `< ${th.DELAY_WARN_MS}`, `${th.DELAY_WARN_MS}…${th.DELAY_ALARM_MS}`, `≥ ${th.DELAY_ALARM_MS}`)}
            ${rowCrit("Задержка назад, мс", p["Задержка назад, мс"], `< ${th.DELAY_WARN_MS}`, `${th.DELAY_WARN_MS}…${th.DELAY_ALARM_MS}`, `≥ ${th.DELAY_ALARM_MS}`)}
            ${rowCrit("Повторы вперёд, шт", p["Повторы вперёд, шт"], `< ${th.RETRY_WARN_MAX}`, `${th.RETRY_WARN_MAX}…${th.RETRY_ALARM_MAX}`, `≥ ${th.RETRY_ALARM_MAX}`)}
            ${rowCrit("Повторы назад, шт", p["Повторы назад, шт"], `< ${th.RETRY_WARN_MAX}`, `${th.RETRY_WARN_MAX}…${th.RETRY_ALARM_MAX}`, `≥ ${th.RETRY_ALARM_MAX}`)}
            ${rowCrit("Потери пакетов вперёд, шт", p["Потери пакетов вперёд, шт"], `< ${th.LOSS_WARN_MAX}`, `${th.LOSS_WARN_MAX}…${th.LOSS_ALARM_MAX}`, `≥ ${th.LOSS_ALARM_MAX}`)}
            ${rowCrit("Потери пакетов назад, шт", p["Потери пакетов назад, шт"], `< ${th.LOSS_WARN_MAX}`, `${th.LOSS_WARN_MAX}…${th.LOSS_ALARM_MAX}`, `≥ ${th.LOSS_ALARM_MAX}`)}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderMssCurrent(ctx){
  const { satNo, sat } = ctx;
  const p = sat?.subsystems?.mss?.params || {};
  const th = mssTh();

  const neighF = satNeighborForward(satNo);
  const neighB = satNeighborBackward(satNo);
  const role = sat?.role === "node" ? "узловой" : "обычный";

  return `
    <div class="egyfmt">
      ${egyptHeader(ctx, "Текущее состояние")}

      <div class="egy-grid">
        <div class="egy-box">
          <div class="egy-box-h">Текущие значения (для журнала)</div>
          ${cell("Роль КА в сети", role, "st-muted")}
          ${cell("Соседний КА вперёд", neighF, "st-muted")}
          ${cell("Соседний КА назад", neighB, "st-muted")}
          ${cell("Транзит ТМ/КИ через КА, кбит/с", p["Транзит ТМ/КИ через КА, кбит/с"], "st-muted")}
          ${cell(
            "Возраст транзитной ТМИ, мс",
            p["Возраст транзитной ТМИ, мс"],
            Number(p["Возраст транзитной ТМИ, мс"]) > th.TRANSIT_AGE_ALARM_MS
              ? "st-alarm"
              : Number(p["Возраст транзитной ТМИ, мс"]) > th.TRANSIT_AGE_WARN_MS
                ? "st-warn"
                : "st-ok"
          )}
          ${cell(
            "Нарушение маршрутизации",
            p["Нарушение маршрутизации"],
            ["да", "есть", "нарушена", "нарушено"].includes(String(p["Нарушение маршрутизации"] || "нет").trim().toLowerCase()) ? "st-alarm" : "st-ok"
          )}
        </div>

        <div class="egy-box">
          <div class="egy-box-h">Рекомендуемые действия</div>
          <div class="egy-note">
            <div class="egy-note-row">1) При предупреждении: проверить рост задержек, повторов и потерь отдельно по направлениям вперёд и назад.</div>
            <div class="egy-note-row">2) При аварии: проверить готовность терминалов, захват соседнего КА и нарушение маршрутизации.</div>
            <div class="egy-note-row">3) Для узлового КА деградация МСС особенно критична, так как влияет на транзит ТМИ и КИ по плоскости.</div>
          </div>
        </div>

        <div class="egy-box" style="grid-column:1 / -1;">
          <div class="egy-crit">
            <div class="egy-crit-h">Критерии состояния (формализовано)</div>
            <div class="egy-crit-row"><span class="mono">МСС = Норма</span> если оба направления работоспособны или доступная конфигурация обеспечивает требуемую связность по плоскости.</div>
            <div class="egy-crit-row"><span class="mono">МСС = Предупреждение</span> если один из каналов деградирует, но связность ещё сохраняется.</div>
            <div class="egy-crit-row"><span class="mono">МСС = Авария</span> если нарушена маршрутизация или фактически потеряна связность по плоскости.</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderMssLinks(ctx){
  const { satNo, sat } = ctx;
  const sub = sat?.subsystems?.mss;
  const p = sub?.params || {};
  const fwd = sub?._detail?.forward || { st: "warn", msg: "—" };
  const back = sub?._detail?.backward || { st: "warn", msg: "—" };

  const neighF = satNeighborForward(satNo);
  const neighB = satNeighborBackward(satNo);

  return `
    <div class="egyfmt">
      ${egyptHeader(ctx, "Каналы вперёд и назад")}

      <div class="egy-grid">
        <div class="egy-box">
          <div class="egy-box-h">Канал вперёд</div>
          ${cell("Соседний КА", neighF, "st-muted")}
          ${cell("Терминал готов", p["Терминал вперёд"], String(p["Терминал вперёд"] || "готов").toLowerCase() === "готов" ? "st-ok" : "st-alarm")}
          ${cell("Захват", p["Захват вперёд"], String(p["Захват вперёд"] || "захват установлен").toLowerCase() === "захват установлен" ? "st-ok" : String(p["Захват вперёд"] || "захват установлен").toLowerCase() === "поиск" ? "st-warn" : "st-alarm")}
          ${cell("Задержка, мс", p["Задержка вперёд, мс"], "st-muted")}
          ${cell("Потери пакетов, шт", p["Потери пакетов вперёд, шт"], "st-muted")}
          ${cell("Повторы, шт", p["Повторы вперёд, шт"], "st-muted")}
          ${cell("Статус канала", chWord(fwd.st), badgeClass(fwd.st), fwd.msg)}
        </div>

        <div class="egy-box">
          <div class="egy-box-h">Канал назад</div>
          ${cell("Соседний КА", neighB, "st-muted")}
          ${cell("Терминал готов", p["Терминал назад"], String(p["Терминал назад"] || "готов").toLowerCase() === "готов" ? "st-ok" : "st-alarm")}
          ${cell("Захват", p["Захват назад"], String(p["Захват назад"] || "захват установлен").toLowerCase() === "захват установлен" ? "st-ok" : String(p["Захват назад"] || "захват установлен").toLowerCase() === "поиск" ? "st-warn" : "st-alarm")}
          ${cell("Задержка, мс", p["Задержка назад, мс"], "st-muted")}
          ${cell("Потери пакетов, шт", p["Потери пакетов назад, шт"], "st-muted")}
          ${cell("Повторы, шт", p["Повторы назад, шт"], "st-muted")}
          ${cell("Статус канала", chWord(back.st), badgeClass(back.st), back.msg)}
        </div>

        <div class="egy-box" style="grid-column:1 / -1;">
          <div class="egy-note">
            <div class="egy-note-row"><b>Топология:</b> МСС работает только внутри одной орбитальной плоскости.</div>
            <div class="egy-note-row"><b>Направления:</b> каждый КА имеет два направления — вперёд и назад по плоскости.</div>
            <div class="egy-note-row"><b>Все КА идентичны:</b> узловой КА отличается не аппаратурой, а текущей сетевой ролью.</div>
          </div>
        </div>
      </div>
    </div>
  `;
}