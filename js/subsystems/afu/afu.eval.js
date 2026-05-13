import { worst } from "../../core/util.js";
import { TH } from "../../model/thresholds.js";

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

function stateClassValue(value){
  const s = String(value || "").trim().toLowerCase();
  if(s.includes("перенаст") || s.includes("огранич")) return "warn";
  if(isFailure(value)) return "alarm";
  return "ok";
}

export function makeNominalParamsAFU(){
  const r = (n,k=1)=>Math.round((n+(Math.random()-0.5)*k)*100)/100;
  const ri = (n,k=1)=>Math.max(0, Math.round(n+(Math.random()-0.5)*k));

  const beams = Math.max(1, Math.min(8, ri(6,3)));

  return {
    "Режим АФУ": "рабочий режим связи",
    "Диапазон АФУ": "S/Ku/Ka",
    "Тип антенного модуля": "ФАР",

    "Активные лучи, шт": beams,
    "Активный сектор": `сектор ${Math.max(1, Math.min(8, ri(3,4)))}`,
    "Готовность лучеобразования": "готово",
    "Ошибка наведения луча, град": r(0.12,0.12),
    "Конфигурация лучей": "штатная",

    "Состояние приёмного тракта": "норма",
    "Состояние передающего тракта": "норма",
    "Состояние коммутаторов": "штатное",
    "Состояние фильтров S/Ku/Ka": "штатное",
    "Состояние МШУ": "норма",
    "Тракт измерения мощности": "норма",

    "КСВН": r(1.35,0.25),
    "Измеренная мощность, Вт": r(30,4),
    "Отклонение мощности, %": r(3,3),
    "Температура АФУ, °C": ri(34,8),

    "Телеметрия АФУ": "поступает",
    "Квитанции команд АФУ": "есть",
    "Ограничение от БРК": "нет",
    "Ограничение от СУБА": "нет",
  };
}

export function evalAfuStatus(sat){
  const th = TH.afu;

  if(sat.inactive){
    sat.subsystems.afu.st = "inactive";
    sat.subsystems.afu.msg = "Не в эксплуатации";
    return;
  }

  const ageMs = Date.now() - sat.lastUpdateMs;
  if(sat.link !== "ok" || ageMs > th.AGE_ALARM_MS){
    sat.subsystems.afu.st = "alarm";
    sat.subsystems.afu.msg = "Нет достоверной ТМИ АФУ";
    return;
  }

  const p = sat.subsystems.afu.params || {};

  const brkSt = sat.subsystems?.brk?.st || "ok";
  const subaSt = sat.subsystems?.suba?.st || "ok";
  p["Ограничение от БРК"] = (brkSt === "warn" || brkSt === "alarm") ? "есть" : "нет";
  p["Ограничение от СУБА"] = (subaSt === "warn" || subaSt === "alarm") ? "есть" : "нет";

  const mode = String(p["Режим АФУ"] || "").toLowerCase();
  const beams = Number(p["Активные лучи, шт"]);
  const pointErr = Number(p["Ошибка наведения луча, град"]);
  const vswr = Number(p["КСВН"]);
  const pwrDev = Number(p["Отклонение мощности, %"]);
  const temp = Number(p["Температура АФУ, °C"]);

  const beamReadyBad = isFailure(p["Готовность лучеобразования"]);
  const rxBad = isFailure(p["Состояние приёмного тракта"]);
  const txBad = isFailure(p["Состояние передающего тракта"]);
  const switchBad = isFailure(p["Состояние коммутаторов"]);
  const filterBad = isFailure(p["Состояние фильтров S/Ku/Ka"]);
  const lnaBad = isFailure(p["Состояние МШУ"]);
  const powerMeasBad = isFailure(p["Тракт измерения мощности"]);
  const tmBad = isMissing(p["Телеметрия АФУ"]);
  const ackBad = isMissing(p["Квитанции команд АФУ"]);

  let st = "ok";
  let msg = "Норма";

  if(beamReadyBad){ st = "alarm"; msg = "Нарушена готовность лучеобразования АФУ"; }
  if(st !== "alarm" && rxBad){ st = "alarm"; msg = "Нарушение приёмного тракта АФУ"; }
  if(st !== "alarm" && txBad){ st = "alarm"; msg = "Нарушение передающего тракта АФУ"; }
  if(st !== "alarm" && switchBad){ st = "alarm"; msg = "Отказ коммутаторов АФУ"; }
  if(st !== "alarm" && filterBad){ st = "alarm"; msg = "Отказ фильтров S/Ku/Ka"; }
  if(st !== "alarm" && lnaBad){ st = "alarm"; msg = "Отказ МШУ"; }

  if(st !== "alarm" && mode.includes("рабоч") && Number.isFinite(beams) && beams <= 0){
    st = "alarm";
    msg = "Нет активных лучей АФУ в рабочем режиме";
  }

  if(st !== "alarm" && Number.isFinite(pointErr) && pointErr > th.BEAM_POINT_ALARM_DEG){
    st = "alarm";
    msg = "Недопустимая ошибка наведения луча";
  }

  if(st !== "alarm" && Number.isFinite(vswr) && vswr > th.VSWR_ALARM){
    st = "alarm";
    msg = "Недопустимый КСВН антенного тракта";
  }

  if(st !== "alarm" && Number.isFinite(pwrDev) && Math.abs(pwrDev) > th.POWER_DEV_ALARM_PCT){
    st = "alarm";
    msg = "Недопустимое отклонение мощности АФУ";
  }

  if(st !== "alarm" && Number.isFinite(temp) && temp > th.TEMP_ALARM_MAX_C){
    st = "alarm";
    msg = "Перегрев АФУ";
  }

  if(st !== "alarm"){
    if(stateClassValue(p["Конфигурация лучей"]) === "warn"){
      st = worst(st,"warn");
      msg = "Перенастройка лучевой конфигурации";
    }

    if(Number.isFinite(pointErr) && pointErr > th.BEAM_POINT_WARN_DEG){
      st = worst(st,"warn");
      msg = "Рост ошибки наведения луча";
    }

    if(Number.isFinite(vswr) && vswr > th.VSWR_WARN){
      st = worst(st,"warn");
      msg = "Рост КСВН антенного тракта";
    }

    if(Number.isFinite(pwrDev) && Math.abs(pwrDev) > th.POWER_DEV_WARN_PCT){
      st = worst(st,"warn");
      msg = "Отклонение измеренной мощности";
    }

    if(Number.isFinite(temp) && temp > th.TEMP_WARN_MAX_C){
      st = worst(st,"warn");
      msg = "Повышенная температура АФУ";
    }

    if(powerMeasBad){
      st = worst(st,"warn");
      msg = "Нет подтверждения тракта измерения мощности";
    }

    if(tmBad){
      st = worst(st,"warn");
      msg = "Нет подтверждения телеметрии АФУ";
    }

    if(ackBad){
      st = worst(st,"warn");
      msg = "Нет квитанций команд АФУ";
    }

    if(p["Ограничение от БРК"] === "есть"){
      st = worst(st,"warn");
      msg = "АФУ ограничена по состоянию БРК";
    }

    if(p["Ограничение от СУБА"] === "есть"){
      st = worst(st,"warn");
      msg = "АФУ ограничена по состоянию СУБА";
    }
  }

  sat.subsystems.afu.st = st;
  sat.subsystems.afu.msg = msg;
}
