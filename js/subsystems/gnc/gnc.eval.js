import { worst } from "../../core/util.js";
import { TH } from "../../model/thresholds.js";

function yes(value){
  const s = String(value || "").trim().toLowerCase();
  return s === "да" || s === "есть" || s === "идёт" || s === "выполняется" || s === "активна";
}

function readyState(value){
  const s = String(value || "").trim().toLowerCase();
  if(s === "не готово" || s === "нет" || s === "ошибка" || s === "отказ") return "alarm";
  if(s === "ограничено" || s === "частично" || s === "уточняется") return "warn";
  return "ok";
}

function makeCorrectionState(flag, maneuver, tBefore, tAfter){
  if(yes(maneuver)) return "выполнение";
  if(Number.isFinite(tAfter) && tAfter > 0) return "постконтроль";
  if(yes(flag) || (Number.isFinite(tBefore) && tBefore > 0)) return "запланирована";
  return "ожидание";
}

export function makeNominalParamsGNC(){
  const r = (n,k=1)=>Math.round((n+(Math.random()-0.5)*k)*1000)/1000;
  const ri = (n,k=1)=>Math.max(0, Math.round(n+(Math.random()-0.5)*k));

  return {
    "Режим СУДН": "дежурный",
    "Источник навигации": Math.random() < 0.70 ? "ГНСС" : "ГНСС+ИНС",
    "Готовность навигационного решения": "готово",
    "Валидные навигационные измерения, шт": ri(6,2),

    "СКО положения, м": ri(32,18),
    "СКО скорости, м/с": r(0.035,0.025),
    "Возраст навигационного решения, мс": ri(1200,800),

    "Флаг коррекции орбиты": "нет",
    "Тип коррекции": "нет",
    "Манёвр коррекции": "нет",
    "Состояние автомата коррекции": "ожидание",
    "Таймер до манёвра, с": 0,
    "Таймер после манёвра, с": 0,

    "Плановое ΔV, мм/с": 0,
    "Фактическое ΔV, мм/с": 0,
    "Расхождение ΔV, мм/с": 0,
    "Разрешение коррекции": "разрешена",
  };
}

export function evalGncStatus(sat){
  const th = TH.gnc;

  if(sat.inactive){
    sat.subsystems.gnc.st = "inactive";
    sat.subsystems.gnc.msg = "Не в эксплуатации";
    return;
  }

  const ageTmiMs = Date.now() - sat.lastUpdateMs;
  if(sat.link !== "ok" || ageTmiMs > th.NAV_AGE_ALARM_MS){
    sat.subsystems.gnc.st = "alarm";
    sat.subsystems.gnc.msg = "Нет достоверной ТМИ СУДН";
    return;
  }

  const p = sat.subsystems.gnc.params || {};

  const sigmaPos = Number(p["СКО положения, м"]);
  const sigmaVel = Number(p["СКО скорости, м/с"]);
  const validMeas = Number(p["Валидные навигационные измерения, шт"]);
  const navAge = Number(p["Возраст навигационного решения, мс"]);

  const flag = yes(p["Флаг коррекции орбиты"]);
  const maneuver = yes(p["Манёвр коррекции"]);
  const tBefore = Number(p["Таймер до манёвра, с"]);
  const tAfter = Number(p["Таймер после манёвра, с"]);
  const dvPlan = Number(p["Плановое ΔV, мм/с"]);
  const dvFact = Number(p["Фактическое ΔV, мм/с"]);

  const correctionState = makeCorrectionState(flag, maneuver, tBefore, tAfter);
  p["Состояние автомата коррекции"] = correctionState;

  if(correctionState === "запланирована") p["Режим СУДН"] = "подготовка коррекции";
  else if(correctionState === "выполнение") p["Режим СУДН"] = "коррекция орбиты";
  else if(correctionState === "постконтроль") p["Режим СУДН"] = "постконтроль";
  else if(!String(p["Режим СУДН"] || "").trim()) p["Режим СУДН"] = "дежурный";

  if(Number.isFinite(dvPlan) && Number.isFinite(dvFact)){
    p["Расхождение ΔV, мм/с"] = Math.round(Math.abs(dvPlan - dvFact));
  }

  let st = "ok";
  let msg = "Норма";

  const ready = readyState(p["Готовность навигационного решения"]);
  if(ready === "alarm"){
    st = "alarm";
    msg = "Навигационное решение не готово";
  }else if(ready === "warn"){
    st = worst(st,"warn");
    msg = "Навигационное решение ограничено";
  }

  if(st !== "alarm" && Number.isFinite(validMeas)){
    if(validMeas < th.VALID_NAV_MEAS_WARN_MIN){ st = "alarm"; msg = "Недостаточно валидных навигационных измерений"; }
    else if(validMeas < th.VALID_NAV_MEAS_OK_MIN){ st = worst(st,"warn"); msg = "Снижено число валидных навигационных измерений"; }
  }

  if(st !== "alarm" && Number.isFinite(sigmaPos)){
    if(sigmaPos > th.POS_SIGMA_ALARM_MAX_M){ st = "alarm"; msg = "Недостоверная навигация по положению"; }
    else if(sigmaPos > th.POS_SIGMA_OK_MAX_M){ st = worst(st,"warn"); msg = "Снижена точность навигации по положению"; }
  }

  if(st !== "alarm" && Number.isFinite(sigmaVel)){
    if(sigmaVel > th.VEL_SIGMA_ALARM_MAX_MS){ st = "alarm"; msg = "Недостоверная навигация по скорости"; }
    else if(sigmaVel > th.VEL_SIGMA_OK_MAX_MS){ st = worst(st,"warn"); msg = "Снижена точность навигации по скорости"; }
  }

  if(st !== "alarm" && Number.isFinite(navAge)){
    if(navAge > th.NAV_AGE_ALARM_MS){ st = "alarm"; msg = "Навигационное решение устарело"; }
    else if(navAge > th.NAV_AGE_WARN_MS){ st = worst(st,"warn"); msg = "Рост возраста навигационного решения"; }
  }

  if(st !== "alarm" && flag && ready !== "ok"){
    st = "alarm";
    msg = "Коррекция запрещена при неготовой навигации";
  }

  if(st !== "alarm" && Number.isFinite(dvPlan) && Number.isFinite(dvFact) && dvPlan > 0){
    const d = Math.abs(dvPlan - dvFact);
    if(d > th.DV_ALARM_MMS){ st = "alarm"; msg = "Расхождение ΔV выше аварийного порога"; }
    else if(d > th.DV_WARN_MMS){ st = worst(st,"warn"); msg = "Расхождение планового и фактического ΔV"; }
  }

  if(!sat.subsystems.gnc._maneuver){
    sat.subsystems.gnc._maneuver = { state: correctionState, t0: Date.now() };
  }
  const m = sat.subsystems.gnc._maneuver;
  if(m.state !== correctionState){
    m.state = correctionState;
    m.t0 = Date.now();
  }

  const dtS = (Date.now() - m.t0) / 1000;
  if(correctionState === "выполнение" && dtS > th.MANEUVER_ACTIVE_TIMEOUT_S){
    st = "alarm";
    msg = "Манёвр коррекции превысил допустимое время";
  }

  if(st === "ok" && correctionState !== "ожидание"){
    msg = `Коррекция орбиты: ${correctionState}`;
  }

  sat.subsystems.gnc.st = st;
  sat.subsystems.gnc.msg = msg;
  sat.subsystems.gnc._detail = {
    nav: { sigmaPos, sigmaVel, validMeas, navAge, ready: p["Готовность навигационного решения"] },
    maneuver: { state: correctionState, dtS, flag, maneuver, tBefore, tAfter },
    dv: { dvPlan, dvFact, dvDelta: Number(p["Расхождение ΔV, мм/с"]) },
    timeSource: th.TIME_SOURCE
  };
}
