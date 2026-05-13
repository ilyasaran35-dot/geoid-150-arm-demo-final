import { worst } from "../../core/util.js";
import { TH } from "../../model/thresholds.js";

function isActive(value){
  const s = String(value || "").trim().toLowerCase();
  return s === "идёт" || s === "выполняется" || s === "есть" || s === "активен" || s === "да";
}

function isBadEvent(value){
  const s = String(value || "").trim().toLowerCase();
  return s === "да" || s === "есть" || s === "сработал" || s === "сработала" || s === "отказ" || s === "ошибка" || s === "запрещена" || s === "запрещено";
}

function isNotReady(value){
  const s = String(value || "").trim().toLowerCase();
  return s === "не готова" || s === "не готов" || s === "нет" || s === "отказ" || s === "ошибка";
}

export function makeNominalParamsPROP(){
  const r=(n,k=1)=>Math.round((n+(Math.random()-0.5)*k)*100)/100;
  const ri=(n,k=1)=>Math.max(0, Math.round(n+(Math.random()-0.5)*k));

  return {
    "Тип ДУ": "ЭРДУ СПД-50",
    "Режим ДУ": "ожидание",
    "Состояние автомата ДУ": "ожидание",
    "Готовность ДУ": "готова",
    "Разрешение работы ДУ": "разрешена",

    "Манёвр ДУ": "нет",
    "Флаг импульса коррекции": "нет",
    "Тип коррекции": "нет",
    "Таймер до включения ДУ, с": 0,
    "Длительность импульса, с": 0,
    "Таймер после импульса, с": 0,

    "Плановое ΔV, мм/с": 0,
    "Фактическое ΔV, мм/с": 0,
    "Расхождение ΔV, мм/с": 0,

    "Тяга, мН": r(0,0.3),
    "Ток ДУ, А": r(0.05,0.08),
    "Напряжение питания ДУ, В": r(28.0,0.8),
    "Температура ДУ, °C": ri(28,10),
    "Давление магистрали рабочего тела, бар": r(18,3),

    "Клапан подачи рабочего тела": "закрыт",
    "Отказ клапана подачи": "нет",
    "Состояние источника питания ДУ": "готов",
    "Запрет ДУ": "нет",
    "Запрещённая конфигурация ДУ": "нет",
    "Квитанции команд ДУ": "есть",
    "Телеметрия ДУ": "поступает",
  };
}

export function evalPropStatus(sat){
  const th = TH.prop;

  if(sat.inactive){
    sat.subsystems.prop.st="inactive";
    sat.subsystems.prop.msg="Не в эксплуатации";
    return;
  }

  const ageMs = Date.now() - sat.lastUpdateMs;
  if(sat.link!=="ok" || ageMs>th.AGE_ALARM_MS){
    sat.subsystems.prop.st="alarm";
    sat.subsystems.prop.msg="Нет достоверной ТМИ ДУ";
    return;
  }

  const p = sat.subsystems.prop.params || {};

  const maneuver = isActive(p["Манёвр ДУ"]);
  const impulseFlag = isActive(p["Флаг импульса коррекции"]);
  const ban = isBadEvent(p["Запрет ДУ"]);
  const forbidden = isBadEvent(p["Запрещённая конфигурация ДУ"]);
  const valveFail = isBadEvent(p["Отказ клапана подачи"]);
  const readyBad = isNotReady(p["Готовность ДУ"]);
  const powerBad = isNotReady(p["Состояние источника питания ДУ"]);
  const ackBad = isNotReady(p["Квитанции команд ДУ"]);
  const tmBad = isNotReady(p["Телеметрия ДУ"]);

  const pressure = Number(p["Давление магистрали рабочего тела, бар"]);
  const temp = Number(p["Температура ДУ, °C"]);
  const thrust = Number(p["Тяга, мН"]);
  const voltage = Number(p["Напряжение питания ДУ, В"]);
  const dvPlan = Number(p["Плановое ΔV, мм/с"]);
  const dvFact = Number(p["Фактическое ΔV, мм/с"]);
  const duration = Number(p["Длительность импульса, с"]);

  if(Number.isFinite(dvPlan) && Number.isFinite(dvFact)){
    p["Расхождение ΔV, мм/с"] = Math.round(Math.abs(dvPlan - dvFact));
  }

  if(!sat.subsystems.prop._sm){
    sat.subsystems.prop._sm = { state:"ожидание", t0: Date.now() };
  }
  const sm = sat.subsystems.prop._sm;

  if(ban || forbidden){
    sm.state = "запрет";
  }else if(maneuver){
    if(sm.state !== "выдача импульса"){
      sm.state = "выдача импульса";
      sm.t0 = Date.now();
    }
  }else if(impulseFlag || String(p["Режим ДУ"] || "").toLowerCase().includes("подготов")){
    sm.state = "подготовка";
  }else if(Number(p["Таймер после импульса, с"]) > 0){
    sm.state = "постконтроль";
  }else{
    sm.state = "ожидание";
  }

  p["Состояние автомата ДУ"] = sm.state;

  let st="ok", msg="Норма";

  if(ban){ st="alarm"; msg="Запрет ДУ"; }
  if(forbidden){ st="alarm"; msg="Запрещённая конфигурация ДУ"; }
  if(valveFail){ st="alarm"; msg="Отказ клапана подачи рабочего тела"; }
  if(maneuver && readyBad){ st="alarm"; msg="ДУ не готова при активном манёвре"; }
  if(maneuver && powerBad){ st="alarm"; msg="Источник питания ДУ не готов при активном манёвре"; }

  if(st!=="alarm" && Number.isFinite(pressure)){
    if(pressure <= th.MAG_PRESS_ALARM_MIN_BAR){ st="alarm"; msg="Недопустимое давление магистрали рабочего тела"; }
    else if(pressure <= th.MAG_PRESS_WARN_MIN_BAR){ st=worst(st,"warn"); msg="Снижение давления магистрали рабочего тела"; }
  }

  if(st!=="alarm" && Number.isFinite(temp)){
    if(temp >= th.TEMP_ALARM_MAX_C){ st="alarm"; msg="Перегрев ДУ"; }
    else if(temp >= th.TEMP_WARN_MAX_C){ st=worst(st,"warn"); msg="Повышенная температура ДУ"; }
  }

  if(st!=="alarm" && Number.isFinite(voltage)){
    if(voltage < th.SUPPLY_ALARM_MIN_V){ st="alarm"; msg="Недопустимое напряжение питания ДУ"; }
    else if(voltage < th.SUPPLY_WARN_MIN_V){ st=worst(st,"warn"); msg="Снижение напряжения питания ДУ"; }
  }

  const dvDelta = Number(p["Расхождение ΔV, мм/с"]);
  if(st!=="alarm" && Number.isFinite(dvDelta)){
    if(dvDelta >= th.DV_ALARM_MMS){ st="alarm"; msg="Недопустимое расхождение ΔV"; }
    else if(dvDelta >= th.DV_WARN_MMS){ st=worst(st,"warn"); msg="Расхождение ΔV выше нормы"; }
  }

  if(st!=="alarm" && maneuver){
    if(Number.isFinite(thrust) && thrust < th.THRUST_ACTIVE_MIN_MN){ st="alarm"; msg="Нет подтверждения тяги при активном манёвре"; }
    if(Number.isFinite(duration) && duration >= th.MANEUVER_TIMEOUT_S){ st="alarm"; msg="Превышен таймаут импульса ДУ"; }
  }

  if(st!=="alarm"){
    if(readyBad){ st=worst(st,"warn"); msg="Готовность ДУ не подтверждена"; }
    if(powerBad){ st=worst(st,"warn"); msg="Источник питания ДУ не готов"; }
    if(ackBad){ st=worst(st,"warn"); msg="Нет квитанций команд ДУ"; }
    if(tmBad){ st=worst(st,"warn"); msg="Нет подтверждения телеметрии ДУ"; }
    if(sm.state === "подготовка" || sm.state === "постконтроль"){
      st=worst(st,"warn");
      if(msg === "Норма") msg="ДУ в переходном режиме";
    }
    if(st === "ok" && maneuver) msg="Импульс ДУ выполняется";
  }

  sat.subsystems.prop.st=st;
  sat.subsystems.prop.msg=msg;
  sat.subsystems.prop._detail = { sm:{...sm}, timeSource: th.TIME_SOURCE };
}
