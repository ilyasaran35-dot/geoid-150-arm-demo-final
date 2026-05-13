import { worst } from "../../core/util.js";
import { TH } from "../../model/thresholds.js";

function isNotReady(value){
  const s = String(value || "").trim().toLowerCase();
  return s === "не готов" || s === "нет" || s === "отказ" || s === "ошибка";
}

function isCaptureLost(value){
  const s = String(value || "").trim().toLowerCase();
  return s === "захват потерян" || s === "нет" || s === "отказ" || s === "ошибка";
}

function isCaptureSearch(value){
  const s = String(value || "").trim().toLowerCase();
  return s === "поиск" || s === "поиск захвата";
}

function isYes(value){
  const s = String(value || "").trim().toLowerCase();
  return s === "да" || s === "есть" || s === "нарушена" || s === "нарушено";
}

function channelState(name, ready, capture, delay, retry, loss, th){
  if(isNotReady(ready)) return { st:"alarm", msg:`${name}: терминал не готов` };
  if(isCaptureLost(capture)) return { st:"alarm", msg:`${name}: захват потерян` };
  if(isCaptureSearch(capture)) return { st:"warn", msg:`${name}: поиск захвата` };

  const d = Number(delay);
  const r = Number(retry);
  const l = Number(loss);

  if(Number.isFinite(d) && d >= th.DELAY_ALARM_MS) return { st:"alarm", msg:`${name}: задержка выше аварийного порога` };
  if(Number.isFinite(r) && r >= th.RETRY_ALARM_MAX) return { st:"alarm", msg:`${name}: чрезмерные повторы` };
  if(Number.isFinite(l) && l >= th.LOSS_ALARM_MAX) return { st:"alarm", msg:`${name}: потери пакетов` };

  if(
    (Number.isFinite(d) && d >= th.DELAY_WARN_MS) ||
    (Number.isFinite(r) && r >= th.RETRY_WARN_MAX) ||
    (Number.isFinite(l) && l >= th.LOSS_WARN_MAX)
  ){
    return { st:"warn", msg:`${name}: деградация канала` };
  }

  return { st:"ok", msg:`${name}: норма` };
}

export function makeNominalParamsMSS(){
  const ri = (n,k=1)=>Math.max(0, Math.round(n + (Math.random()-0.5)*k));

  return {
    "Топология МСС": "внутри плоскости",
    "Направления МСС": "вперёд / назад",
    "Роль КА в сети МСС": "обычный",

    "Терминал вперёд": "готов",
    "Терминал назад": "готов",
    "Захват вперёд": "захват установлен",
    "Захват назад": "захват установлен",

    "Потери пакетов вперёд, шт": ri(0,1),
    "Потери пакетов назад, шт": ri(0,1),
    "Повторы вперёд, шт": ri(0,2),
    "Повторы назад, шт": ri(0,2),
    "Задержка вперёд, мс": ri(25,12),
    "Задержка назад, мс": ri(28,12),

    "Возраст транзитной ТМИ, мс": ri(800,400),
    "Транзит ТМ/КИ через КА, кбит/с": ri(900,400),
    "Агрегация ТМИ на узловом КА": "нет",
    "Нарушение маршрутизации": "нет",
  };
}

export function evalMssStatus(sat){
  const th = TH.mss;

  if(sat.inactive){
    sat.subsystems.mss.st = "inactive";
    sat.subsystems.mss.msg = "Не в эксплуатации";
    return;
  }

  const ageMs = Date.now() - sat.lastUpdateMs;
  if(sat.link !== "ok" || ageMs > th.TRANSIT_AGE_ALARM_MS){
    sat.subsystems.mss.st = "alarm";
    sat.subsystems.mss.msg = "Нет достоверной ТМИ МСС";
    return;
  }

  const p = sat.subsystems.mss.params || {};

  p["Роль КА в сети МСС"] = sat.role === "node" ? "узловой" : "обычный";
  p["Агрегация ТМИ на узловом КА"] = sat.role === "node" ? "есть" : "нет";

  const fwd = channelState(
    "направление вперёд",
    p["Терминал вперёд"],
    p["Захват вперёд"],
    p["Задержка вперёд, мс"],
    p["Повторы вперёд, шт"],
    p["Потери пакетов вперёд, шт"],
    th
  );

  const back = channelState(
    "направление назад",
    p["Терминал назад"],
    p["Захват назад"],
    p["Задержка назад, мс"],
    p["Повторы назад, шт"],
    p["Потери пакетов назад, шт"],
    th
  );

  const transit = Number(p["Транзит ТМ/КИ через КА, кбит/с"]);
  const transitAge = Number(p["Возраст транзитной ТМИ, мс"]);

  let st = "ok";
  let msg = "Норма";

  if(isYes(p["Нарушение маршрутизации"])){
    st = "alarm";
    msg = "Нарушение маршрутизации МСС";
  }

  if(st !== "alarm" && fwd.st === "alarm" && back.st === "alarm"){
    st = "alarm";
    msg = "Потеря связности по плоскости";
  }

  if(st !== "alarm" && Number.isFinite(transitAge) && transitAge >= th.TRANSIT_AGE_ALARM_MS){
    st = "alarm";
    msg = "Устаревание транзитной ТМИ";
  }

  if(st !== "alarm"){
    st = worst(st, fwd.st);
    st = worst(st, back.st);

    if(st === "warn"){
      msg = fwd.st !== "ok" ? fwd.msg : back.msg;
    }

    if(Number.isFinite(transitAge) && transitAge >= th.TRANSIT_AGE_WARN_MS){
      st = worst(st,"warn");
      msg = "Рост возраста транзитной ТМИ";
    }

    if(Number.isFinite(transit) && transit >= th.SERVICE_RATE_ALARM_KBIT_S){
      st = "alarm";
      msg = "Перегрузка транзитного обмена МСС";
    }else if(Number.isFinite(transit) && transit >= th.SERVICE_RATE_WARN_KBIT_S){
      st = worst(st,"warn");
      msg = "Повышенный транзит ТМ/КИ через КА";
    }
  }

  sat.subsystems.mss._detail = {
    forward: fwd,
    backward: back
  };

  sat.subsystems.mss.st = st;
  sat.subsystems.mss.msg = msg;
}