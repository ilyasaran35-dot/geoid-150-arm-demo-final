import { worst } from "../../core/util.js";
import { TH } from "../../model/thresholds.js";

export function makeNominalParamsTMI(){
  const ri = (n,k=1)=>Math.max(0, Math.round(n + (Math.random()-0.5)*k));

  return {
    "Источник ТМИ": "БКУ/БВС",
    "Поток ТМИ": "основной",
    "Окно анализа, с": TH.tmi.WINDOW_S,

    "Возраст данных, мс": ri(1200,700),
    "Полнота кадров, %": Math.min(100, ri(99,3)),
    "Достоверные параметры, %": Math.min(100, ri(99,2)),
    "Недостоверные параметры, шт": 0,

    "Ошибки контроля целостности, шт": 0,
    "Превышения времени ожидания, шт": 0,
    "Повторы кадров, шт": ri(1,2),
    "Потерянные кадры, шт": 0,

    "Синхронизация времени": "норма",
    "Буферизация ТМИ": "норма",
    "Пригодность ТМИ для контроля": "пригодна",
  };
}

function isBad(value){
  const s = String(value || "").trim().toLowerCase();
  return s === "нет" || s === "ошибка" || s === "нарушена" || s === "непригодна" || s === "переполнение";
}

export function evalTmiStatus(sat){
  const th = TH.tmi;

  if(sat.inactive){
    sat.subsystems.tmi.st = "inactive";
    sat.subsystems.tmi.msg = "Не в эксплуатации";
    return;
  }

  const p = sat.subsystems.tmi.params || {};

  const ageMs = Date.now() - sat.lastUpdateMs;
  p["Возраст данных, мс"] = Math.max(0, Math.round(ageMs));

  if(sat.link !== "ok"){
    p["Пригодность ТМИ для контроля"] = "непригодна";
    sat.subsystems.tmi.st = "alarm";
    sat.subsystems.tmi.msg = "Нет достоверной ТМИ";
    return;
  }

  const completeness = Number(p["Полнота кадров, %"]);
  const validity = Number(p["Достоверные параметры, %"]);
  const invalid = Number(p["Недостоверные параметры, шт"]);
  const integrity = Number(p["Ошибки контроля целостности, шт"]);
  const wait = Number(p["Превышения времени ожидания, шт"]);
  const retry = Number(p["Повторы кадров, шт"]);
  const lost = Number(p["Потерянные кадры, шт"]);

  const syncBad = isBad(p["Синхронизация времени"]);
  const bufferBad = isBad(p["Буферизация ТМИ"]);

  let st = "ok";
  let msg = "Норма";

  if(ageMs > th.AGE_ALARM_MS){
    st = "alarm";
    msg = "ТМИ устарела";
  }

  if(st !== "alarm" && Number.isFinite(completeness) && completeness < th.COMPLETENESS_ALARM_MIN_PCT){
    st = "alarm";
    msg = "Недостаточная полнота ТМИ";
  }

  if(st !== "alarm" && Number.isFinite(validity) && validity < th.VALIDITY_ALARM_MIN_PCT){
    st = "alarm";
    msg = "Недостаточная достоверность параметров";
  }

  if(st !== "alarm" && Number.isFinite(invalid) && invalid > th.INVALID_PARAMS_ALARM_MAX){
    st = "alarm";
    msg = "Много недостоверных параметров";
  }

  if(st !== "alarm" && Number.isFinite(integrity) && integrity > th.INTEGRITY_ALARM_MAX){
    st = "alarm";
    msg = "Превышение ошибок контроля целостности";
  }

  if(st !== "alarm" && Number.isFinite(wait) && wait > th.WAIT_ALARM_MAX){
    st = "alarm";
    msg = "Превышение времени ожидания ТМИ";
  }

  if(st !== "alarm" && Number.isFinite(retry) && retry > th.RETRY_ALARM_MAX){
    st = "alarm";
    msg = "Чрезмерное число повторов кадров";
  }

  if(st !== "alarm" && Number.isFinite(lost) && lost > th.LOST_FRAMES_ALARM_MAX){
    st = "alarm";
    msg = "Потеря кадров ТМИ";
  }

  if(st !== "alarm" && syncBad){
    st = "alarm";
    msg = "Нарушена синхронизация времени ТМИ";
  }

  if(st !== "alarm" && bufferBad){
    st = "alarm";
    msg = "Переполнение буфера ТМИ";
  }

  if(st !== "alarm"){
    if(ageMs > th.AGE_WARN_MS){
      st = worst(st,"warn");
      msg = "Рост возраста ТМИ";
    }

    if(Number.isFinite(completeness) && completeness < th.COMPLETENESS_OK_MIN_PCT){
      st = worst(st,"warn");
      msg = "Снижение полноты ТМИ";
    }

    if(Number.isFinite(validity) && validity < th.VALIDITY_OK_MIN_PCT){
      st = worst(st,"warn");
      msg = "Снижение достоверности параметров";
    }

    if(Number.isFinite(invalid) && invalid > th.INVALID_PARAMS_WARN_MAX){
      st = worst(st,"warn");
      msg = "Есть недостоверные параметры";
    }

    if(Number.isFinite(integrity) && integrity > th.INTEGRITY_WARN_MAX){
      st = worst(st,"warn");
      msg = "Рост ошибок контроля целостности";
    }

    if(Number.isFinite(wait) && wait > th.WAIT_WARN_MAX){
      st = worst(st,"warn");
      msg = "Рост превышений времени ожидания";
    }

    if(Number.isFinite(retry) && retry > th.RETRY_WARN_MAX){
      st = worst(st,"warn");
      msg = "Рост повторов кадров";
    }

    if(Number.isFinite(lost) && lost > th.LOST_FRAMES_WARN_MAX){
      st = worst(st,"warn");
      msg = "Потери кадров ТМИ";
    }
  }

  p["Пригодность ТМИ для контроля"] = st === "alarm" ? "непригодна" : st === "warn" ? "ограниченно пригодна" : "пригодна";

  sat.subsystems.tmi.st = st;
  sat.subsystems.tmi.msg = msg;
}