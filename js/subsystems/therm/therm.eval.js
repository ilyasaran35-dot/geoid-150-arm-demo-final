import { worst } from "../../core/util.js";
import { TH } from "../../model/thresholds.js";

const TEMP_FIELDS = [
  "Температура БКУ/БВС, °C",
  "Температура СЭС, °C",
  "Температура АКБ, °C",
  "Температура СУДН, °C",
  "Температура ДУ, °C",
  "Температура БРК, °C",
  "Температура АФУ, °C",
  "Температура МСС, °C",
];

function ri(n, k=1){
  return Math.round(n + (Math.random() - 0.5) * k);
}

function isYes(value){
  const s = String(value || "").trim().toLowerCase();
  return s === "да" || s === "есть" || s === "сработал" || s === "сработала" || s === "отказ" || s === "нарушено" || s === "нарушена";
}

function isOff(value){
  const s = String(value || "").trim().toLowerCase();
  return s === "отключены" || s === "отключён" || s === "отключена" || s === "запрещены" || s === "запрещено" || s === "нет";
}

function zoneLimits(field, th){
  const map = {
    "Температура БКУ/БВС, °C": [th.BKU_WARN_MIN_C, th.BKU_WARN_MAX_C, th.BKU_ALARM_MIN_C, th.BKU_ALARM_MAX_C],
    "Температура СЭС, °C": [th.SES_WARN_MIN_C, th.SES_WARN_MAX_C, th.SES_ALARM_MIN_C, th.SES_ALARM_MAX_C],
    "Температура АКБ, °C": [th.AKB_WARN_MIN_C, th.AKB_WARN_MAX_C, th.AKB_ALARM_MIN_C, th.AKB_ALARM_MAX_C],
    "Температура СУДН, °C": [th.SUDN_WARN_MIN_C, th.SUDN_WARN_MAX_C, th.SUDN_ALARM_MIN_C, th.SUDN_ALARM_MAX_C],
    "Температура ДУ, °C": [th.DU_WARN_MIN_C, th.DU_WARN_MAX_C, th.DU_ALARM_MIN_C, th.DU_ALARM_MAX_C],
    "Температура БРК, °C": [th.BRK_WARN_MIN_C, th.BRK_WARN_MAX_C, th.BRK_ALARM_MIN_C, th.BRK_ALARM_MAX_C],
    "Температура АФУ, °C": [th.AFU_WARN_MIN_C, th.AFU_WARN_MAX_C, th.AFU_ALARM_MIN_C, th.AFU_ALARM_MAX_C],
    "Температура МСС, °C": [th.MSS_WARN_MIN_C, th.MSS_WARN_MAX_C, th.MSS_ALARM_MIN_C, th.MSS_ALARM_MAX_C],
  };
  return map[field] || [0, 50, -10, 65];
}

function tempState(value, field, th){
  const t = Number(value);
  if(!Number.isFinite(t)) return { st:"alarm", msg:`${field}: нет достоверного значения` };

  const [warnMin, warnMax, alarmMin, alarmMax] = zoneLimits(field, th);
  if(t <= alarmMin) return { st:"alarm", msg:`${field}: переохлаждение` };
  if(t >= alarmMax) return { st:"alarm", msg:`${field}: перегрев` };
  if(t <= warnMin) return { st:"warn", msg:`${field}: снижение температуры` };
  if(t >= warnMax) return { st:"warn", msg:`${field}: рост температуры` };
  return { st:"ok", msg:`${field}: норма` };
}

function recomputeDerived(p){
  const vals = TEMP_FIELDS
    .map((k)=>Number(p[k]))
    .filter((v)=>Number.isFinite(v));

  if(vals.length){
    p["Минимальная температура, °C"] = Math.round(Math.min(...vals) * 10) / 10;
    p["Максимальная температура, °C"] = Math.round(Math.max(...vals) * 10) / 10;
    p["Средняя температура, °C"] = Math.round((vals.reduce((a,b)=>a+b,0) / vals.length) * 10) / 10;
  }
}

export function makeNominalParamsTHERM(){
  const p = {
    "Режим СОТР": "штатное терморегулирование",
    "Алгоритм СОТР": "автоматический контроль температур",
    "Экономичный режим обогрева": "нет",

    "Температура БКУ/БВС, °C": ri(28, 8),
    "Температура СЭС, °C": ri(26, 8),
    "Температура АКБ, °C": ri(22, 6),
    "Температура СУДН, °C": ri(24, 8),
    "Температура ДУ, °C": ri(25, 8),
    "Температура БРК, °C": ri(34, 8),
    "Температура АФУ, °C": ri(31, 8),
    "Температура МСС, °C": ri(29, 8),

    "Валидные датчики температуры, шт": 8,
    "Недостоверные датчики температуры, шт": 0,
    "Отказ датчика температуры": "нет",

    "Нагреватели АКБ": "автомат",
    "Нагреватели ДУ": "автомат",
    "Нагреватели БКУ/БВС": "автомат",
    "Нагреватели СУДН": "автомат",
    "Нагреватели БРК/АФУ": "автомат",
    "Управление нагревателями": "автоматическое",
    "Отказ управления нагревателями": "нет",

    "Радиатор полезной нагрузки": "норма",
    "Тепловая защита": "нет",
    "Признак перегрева": "нет",
    "Признак переохлаждения": "нет",

    "Ограничение БРК/АФУ по температуре": "нет",
    "Ограничение ДУ по температуре": "нет",
    "Ограничение СЭС по температуре": "нет",
  };

  recomputeDerived(p);
  return p;
}

export function evalThermStatus(sat){
  const th = TH.therm;

  if(sat.inactive){
    sat.subsystems.therm.st = "inactive";
    sat.subsystems.therm.msg = "Не в эксплуатации";
    return;
  }

  const ageMs = Date.now() - sat.lastUpdateMs;
  if(sat.link !== "ok" || ageMs > th.AGE_ALARM_MS){
    sat.subsystems.therm.st = "alarm";
    sat.subsystems.therm.msg = "Нет достоверной ТМИ СОТР";
    return;
  }

  const p = sat.subsystems.therm.params || {};
  recomputeDerived(p);

  let st = "ok";
  let msg = "Норма";

  const zoneStates = TEMP_FIELDS.map((field)=>({ field, ...tempState(p[field], field, th) }));
  const alarmZone = zoneStates.find((z)=>z.st === "alarm");
  const warnZone = zoneStates.find((z)=>z.st === "warn");

  if(alarmZone){
    st = "alarm";
    msg = alarmZone.msg.replace("Температура ", "");
  }else if(warnZone){
    st = worst(st, "warn");
    msg = warnZone.msg.replace("Температура ", "");
  }

  const validSensors = Number(p["Валидные датчики температуры, шт"]);
  const badSensors = Number(p["Недостоверные датчики температуры, шт"]);
  const sensorFail = isYes(p["Отказ датчика температуры"]);

  if(sensorFail || (Number.isFinite(badSensors) && badSensors >= th.BAD_SENSORS_ALARM_MAX) || (Number.isFinite(validSensors) && validSensors < th.VALID_SENSORS_ALARM_MIN)){
    st = "alarm";
    msg = "Недостаточная достоверность температурных датчиков";
  }else if(st !== "alarm" && ((Number.isFinite(badSensors) && badSensors >= th.BAD_SENSORS_WARN_MAX) || (Number.isFinite(validSensors) && validSensors < th.VALID_SENSORS_WARN_MIN))){
    st = worst(st, "warn");
    msg = "Снижение достоверности температурных датчиков";
  }

  if(st !== "alarm" && ageMs > th.AGE_WARN_MS){
    st = worst(st, "warn");
    msg = "Рост возраста ТМИ СОТР";
  }

  if(isYes(p["Отказ управления нагревателями"])){
    st = "alarm";
    msg = "Отказ управления нагревателями СОТР";
  }

  if(st !== "alarm" && isOff(p["Управление нагревателями"])){ 
    st = worst(st, "warn");
    msg = "Ограничено управление нагревателями";
  }

  const radiator = String(p["Радиатор полезной нагрузки"] || "").trim().toLowerCase();
  if(radiator === "отказ"){
    st = "alarm";
    msg = "Отказ радиатора полезной нагрузки";
  }else if(st !== "alarm" && (radiator === "снижена эффективность" || radiator === "ограничение")){
    st = worst(st, "warn");
    msg = "Снижение эффективности радиатора полезной нагрузки";
  }

  const maxTemp = Number(p["Максимальная температура, °C"]);
  const minTemp = Number(p["Минимальная температура, °C"]);
  p["Признак перегрева"] = Number.isFinite(maxTemp) && maxTemp >= th.GROUP_OVERHEAT_WARN_C ? "есть" : "нет";
  p["Признак переохлаждения"] = Number.isFinite(minTemp) && minTemp <= th.GROUP_OVERCOOL_WARN_C ? "есть" : "нет";
  p["Тепловая защита"] = st === "alarm" ? "есть" : "нет";

  const brkAfuBad = ["Температура БРК, °C", "Температура АФУ, °C"].some((k)=>tempState(p[k], k, th).st !== "ok") || radiator !== "норма";
  const duBad = tempState(p["Температура ДУ, °C"], "Температура ДУ, °C", th).st !== "ok";
  const sesBad = ["Температура СЭС, °C", "Температура АКБ, °C"].some((k)=>tempState(p[k], k, th).st !== "ok");

  p["Ограничение БРК/АФУ по температуре"] = brkAfuBad ? "есть" : "нет";
  p["Ограничение ДУ по температуре"] = duBad ? "есть" : "нет";
  p["Ограничение СЭС по температуре"] = sesBad ? "есть" : "нет";

  sat.subsystems.therm._detail = { zoneStates };
  sat.subsystems.therm.st = st;
  sat.subsystems.therm.msg = msg;
}
