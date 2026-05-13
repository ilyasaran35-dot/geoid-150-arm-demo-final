import { worst } from "../../core/util.js";
import { TH } from "../../model/thresholds.js";

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

function isOff(value){
  const s = String(value || "").trim().toLowerCase();
  return s === "отключён" || s === "отключена" || s === "откл" || s === "нет";
}

function evalInterface(name, data, lim){
  const state = String(data.state || "установлен").toLowerCase();

  if(state !== "установлен"){
    return { st:"alarm", msg:`${name}: канал разомкнут` };
  }

  if(data.busOff === true){
    return { st:"alarm", msg:`${name}: отключение шины` };
  }

  if(Number.isFinite(data.integrity) && data.integrity > lim.integrityAlarm){
    return { st:"alarm", msg:`${name}: ошибки контроля целостности` };
  }

  if(Number.isFinite(data.wait) && data.wait > lim.waitAlarm){
    return { st:"alarm", msg:`${name}: превышения времени ожидания` };
  }

  if(Number.isFinite(data.retry) && data.retry > lim.retryAlarm){
    return { st:"alarm", msg:`${name}: чрезмерные повторы` };
  }

  if(Number.isFinite(data.integrity) && data.integrity > lim.integrityWarn){
    return { st:"warn", msg:`${name}: рост ошибок контроля целостности` };
  }

  if(Number.isFinite(data.wait) && data.wait > lim.waitWarn){
    return { st:"warn", msg:`${name}: рост превышений времени ожидания` };
  }

  if(Number.isFinite(data.retry) && data.retry > lim.retryWarn){
    return { st:"warn", msg:`${name}: рост повторов` };
  }

  return { st:"ok", msg:`${name}: норма` };
}

export function makeNominalParamsSUBA(){
  const ri = (n,k=1)=>Math.max(0, Math.round(n + (Math.random()-0.5)*k));

  return {
    "Режим СУБА": "штатный",
    "Разрешение управления БРК": "разрешено",
    "Разрешение управления АФУ": "разрешено",
    "Конфигурация БРК": "штатная",
    "Конфигурация лучей АФУ": "штатная",
    "Квитанции команд СУБА": "есть",
    "Телеметрия БРК/АФУ": "поступает",

    "Фидер БРК": "включён",
    "Фидер АФУ": "включён",
    "Защита фидера БРК": "нет",
    "Защита фидера АФУ": "нет",
    "Аварийное отключение нагрузки": "нет",

    "Состояние CAN": "установлен",
    "Отключение CAN": "нет",
    "Ошибки контроля целостности CAN, шт": ri(0,3),
    "Превышения времени ожидания CAN, шт": ri(0,2),
    "Повторы CAN, шт": ri(0,3),

    "Состояние RS-485": "установлен",
    "Ошибки контроля целостности RS-485, шт": ri(0,2),
    "Превышения времени ожидания RS-485, шт": ri(0,2),
    "Повторы RS-485, шт": ri(0,2),

    "Состояние SpaceWire": "установлен",
    "Ошибки линии SpaceWire, шт": ri(0,2),
    "Превышения времени ожидания SpaceWire, шт": ri(0,2),
    "Повторы SpaceWire, шт": ri(0,2),
  };
}

export function evalSubaStatus(sat){
  const th = TH.suba;

  if(sat.inactive){
    sat.subsystems.suba.st = "inactive";
    sat.subsystems.suba.msg = "Не в эксплуатации";
    return;
  }

  const ageMs = Date.now() - sat.lastUpdateMs;
  if(sat.link !== "ok" || ageMs > 8000){
    sat.subsystems.suba.st = "alarm";
    sat.subsystems.suba.msg = "Нет достоверной ТМИ СУБА";
    return;
  }

  const p = sat.subsystems.suba.params || {};

  let power = { st:"ok", msg:"Фидеры БРК/АФУ: норма" };

  const brkFeederOff = isOff(p["Фидер БРК"]);
  const afuFeederOff = isOff(p["Фидер АФУ"]);
  const brkProtect = isBad(p["Защита фидера БРК"]);
  const afuProtect = isBad(p["Защита фидера АФУ"]);
  const loadTrip = isBad(p["Аварийное отключение нагрузки"]);

  if(brkProtect || afuProtect || loadTrip){
    power = { st:"alarm", msg:"Сработала защита или аварийное отключение нагрузки" };
  }else if(brkFeederOff || afuFeederOff){
    power = { st:"warn", msg:"Отключён фидер БРК/АФУ" };
  }

  const can = evalInterface("CAN", {
    state: p["Состояние CAN"],
    busOff: isBad(p["Отключение CAN"]),
    integrity: Number(p["Ошибки контроля целостности CAN, шт"]),
    wait: Number(p["Превышения времени ожидания CAN, шт"]),
    retry: Number(p["Повторы CAN, шт"])
  }, {
    integrityWarn: th.CAN_INTEGRITY_WARN_MAX,
    integrityAlarm: th.CAN_INTEGRITY_ALARM_MAX,
    waitWarn: th.CAN_WAIT_WARN_MAX,
    waitAlarm: th.CAN_WAIT_ALARM_MAX,
    retryWarn: th.CAN_RETRY_WARN_MAX,
    retryAlarm: th.CAN_RETRY_ALARM_MAX
  });

  const rs485 = evalInterface("RS-485", {
    state: p["Состояние RS-485"],
    busOff: false,
    integrity: Number(p["Ошибки контроля целостности RS-485, шт"]),
    wait: Number(p["Превышения времени ожидания RS-485, шт"]),
    retry: Number(p["Повторы RS-485, шт"])
  }, {
    integrityWarn: th.RS485_INTEGRITY_WARN_MAX,
    integrityAlarm: th.RS485_INTEGRITY_ALARM_MAX,
    waitWarn: th.RS485_WAIT_WARN_MAX,
    waitAlarm: th.RS485_WAIT_ALARM_MAX,
    retryWarn: th.RS485_RETRY_WARN_MAX,
    retryAlarm: th.RS485_RETRY_ALARM_MAX
  });

  const spw = evalInterface("SpaceWire", {
    state: p["Состояние SpaceWire"],
    busOff: false,
    integrity: Number(p["Ошибки линии SpaceWire, шт"]),
    wait: Number(p["Превышения времени ожидания SpaceWire, шт"]),
    retry: Number(p["Повторы SpaceWire, шт"])
  }, {
    integrityWarn: th.SPW_LINE_WARN_MAX,
    integrityAlarm: th.SPW_LINE_ALARM_MAX,
    waitWarn: th.SPW_WAIT_WARN_MAX,
    waitAlarm: th.SPW_WAIT_ALARM_MAX,
    retryWarn: th.SPW_RETRY_WARN_MAX,
    retryAlarm: th.SPW_RETRY_ALARM_MAX
  });

  let st = "ok";
  let msg = "Норма";

  st = worst(st, power.st);
  st = worst(st, can.st);
  st = worst(st, rs485.st);
  st = worst(st, spw.st);

  if(st !== "alarm"){
    if(isBad(p["Разрешение управления БРК"])){
      st = worst(st, "warn");
      msg = "Управление БРК ограничено";
    }

    if(isBad(p["Разрешение управления АФУ"])){
      st = worst(st, "warn");
      msg = "Управление АФУ ограничено";
    }

    if(isMissing(p["Квитанции команд СУБА"])){
      st = worst(st, "warn");
      msg = "Нет квитанций команд СУБА";
    }

    if(isMissing(p["Телеметрия БРК/АФУ"])){
      st = worst(st, "warn");
      msg = "Нет подтверждения телеметрии БРК/АФУ";
    }
  }

  if(st === "alarm"){
    if(power.st === "alarm") msg = power.msg;
    else if(can.st === "alarm") msg = can.msg;
    else if(rs485.st === "alarm") msg = rs485.msg;
    else if(spw.st === "alarm") msg = spw.msg;
    else msg = "Отказ СУБА";
  }else if(st === "warn"){
    if(msg === "Норма"){
      if(power.st === "warn") msg = power.msg;
      else if(can.st === "warn") msg = can.msg;
      else if(rs485.st === "warn") msg = rs485.msg;
      else if(spw.st === "warn") msg = spw.msg;
      else msg = "Деградация СУБА";
    }
  }else{
    msg = "Норма";
  }

  sat.subsystems.suba._detail = {
    power,
    can,
    rs485,
    spw,
    windowSec: th.WINDOW_S
  };

  sat.subsystems.suba.st = st;
  sat.subsystems.suba.msg = msg;
}