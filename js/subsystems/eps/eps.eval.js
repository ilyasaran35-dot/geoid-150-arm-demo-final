import { worst } from "../../core/util.js";
import { TH } from "../../model/thresholds.js";

export function makeNominalParamsEPS(){
  const r=(n,k=1)=>Math.round((n+(Math.random()-0.5)*k)*100)/100;
  const ri=(n,k=1)=>Math.round((n+(Math.random()-0.5)*k));

  const illum = Math.random()<0.78 ? "ОСВЕЩЕНИЕ" : "ЗАТМЕНИЕ";
  const pGen = illum === "ОСВЕЩЕНИЕ" ? ri(470,60) : Math.max(0, ri(0,10));
  const pNag = illum === "ОСВЕЩЕНИЕ" ? ri(345,50) : ri(385,90);
  const pBal = pGen - pNag;

  return {
    "Uш, В": r(28.0,0.6),
    "Iн, А": r(13.5,4.0),
    "Pген, Вт": pGen,
    "Pнаг, Вт": pNag,
    "Pбал, Вт": pBal,
    "Режим освещённости": illum,
    "Режим СЭС": "штатный",

    "СЗ АКБ, %": ri(78,10),
    "UАКБ, В": r(28.0,0.8),
    "IАКБ, А": illum === "ОСВЕЩЕНИЕ" ? r(1.0,2.5) : r(-4.0,2.0),
    "TАКБ, °C": r(22,6),

    "Защита АКБ": "нет",
    "АКБ отключена": "нет",
    "Отключение нагрузки": "нет",
  };
}

function isYes(v){
  const s = String(v || "").trim().toLowerCase();
  return s === "да" || s === "есть" || s === "сработала" || s === "отключена";
}

function inWarnLowHigh(value, warnMin, okMin, okMax, warnMax){
  if(!Number.isFinite(value)) return null;
  if(value < warnMin || value > warnMax) return "alarm";
  if(value < okMin || value > okMax) return "warn";
  return "ok";
}

export function evalEpsStatus(sat){
  const th = TH.eps;

  // 0) не в эксплуатации
  if(sat.inactive){
    sat.subsystems.eps.st="inactive";
    sat.subsystems.eps.msg="Не в эксплуатации";
    return;
  }

  // 1) нет ТМИ/связи. Глобальную логику "не определено" вынесем отдельным пакетом.
  const ageMs = Date.now() - sat.lastUpdateMs;
  if(sat.link!=="ok" || ageMs>8000){
    sat.subsystems.eps.st="alarm";
    sat.subsystems.eps.msg="Нет достоверной ТМИ";
    return;
  }

  const p = sat.subsystems.eps.params;

  const U = Number(p["Uш, В"]);
  const sz = Number(p["СЗ АКБ, %"]);
  const tAkb = Number(p["TАКБ, °C"]);
  const pGen = Number(p["Pген, Вт"]);
  const pNag = Number(p["Pнаг, Вт"]);
  const pBal = Number.isFinite(pGen) && Number.isFinite(pNag) ? pGen - pNag : Number(p["Pбал, Вт"]);

  if(Number.isFinite(pBal)) p["Pбал, Вт"] = Math.round(pBal);

  const illum = String(p["Режим освещённости"] || "").toUpperCase();
  const inShadow = illum.includes("ЗАТМ") || illum.includes("ТЕНЬ");

  let st="ok", msg="Норма";

  // 2) аварийные дискретные признаки
  if(isYes(p["Защита АКБ"])) { st="alarm"; msg="Сработала защита АКБ"; }
  if(isYes(p["АКБ отключена"])) { st="alarm"; msg="АКБ отключена"; }
  if(isYes(p["Отключение нагрузки"])) { st="alarm"; msg="Отключение нагрузки"; }

  // 3) параметрические признаки
  if(st!=="alarm"){
    const uSt = inWarnLowHigh(U, th.U_BUS_WARN_MIN_V, th.U_BUS_OK_MIN_V, th.U_BUS_OK_MAX_V, th.U_BUS_WARN_MAX_V);
    if(uSt === "alarm") { st="alarm"; msg="Напряжение шины вне аварийного допуска"; }
    else if(uSt === "warn") { st=worst(st,"warn"); msg="Напряжение шины вне нормы"; }
  }

  if(st!=="alarm"){
    if(Number.isFinite(sz) && sz < th.SZ_AKB_WARN_MIN_PCT){ st="alarm"; msg="Низкая степень заряда АКБ"; }
    else if(Number.isFinite(sz) && sz < th.SZ_AKB_OK_MIN_PCT){ st=worst(st,"warn"); msg="Снижение степени заряда АКБ"; }
  }

  if(st!=="alarm"){
    const tSt = inWarnLowHigh(tAkb, th.T_AKB_WARN_MIN_C, th.T_AKB_OK_MIN_C, th.T_AKB_OK_MAX_C, th.T_AKB_WARN_MAX_C);
    if(tSt === "alarm") { st="alarm"; msg="Температура АКБ вне аварийного допуска"; }
    else if(tSt === "warn") { st=worst(st,"warn"); msg="Температура АКБ вне нормы"; }
  }

  if(st!=="alarm" && Number.isFinite(pBal)){
    if(pBal < 0 && !inShadow){ st="alarm"; msg="Отрицательный энергобаланс вне тени"; }
    else if(pBal >= 0 && pBal < th.P_BAL_NEAR_ZERO_W){ st=worst(st,"warn"); msg="Малый запас энергобаланса"; }
  }

  if(st!=="alarm" && String(p["Режим СЭС"]||"").toLowerCase().includes("огранич")){
    st=worst(st,"warn");
    msg="Ограничение нагрузки";
  }

  sat.subsystems.eps.st=st;
  sat.subsystems.eps.msg=msg;
}