import { TOTAL_SATS, satPlane } from "./constell.js";
import { SUBSYSTEMS } from "../core/registry.js";
import { nowStamp } from "../core/util.js";
import { makeNominalParamsEPS } from "../subsystems/eps/eps.eval.js";
import { makeNominalParamsSUBA } from "../subsystems/suba/suba.eval.js";
import { makeNominalParamsGNC } from "../subsystems/gnc/gnc.eval.js";
import { makeNominalParamsADCS } from "../subsystems/adcs/adcs.eval.js";
import { makeNominalParamsPROP } from "../subsystems/prop/prop.eval.js";
import { makeNominalParamsTHERM } from "../subsystems/therm/therm.eval.js";
import { makeNominalParamsTTC } from "../subsystems/ttc/ttc.eval.js";
import { makeNominalParamsCNDH } from "../subsystems/cndh/cndh.eval.js";
import { makeNominalParamsBRK } from "../subsystems/brk/brk.eval.js";
import { makeNominalParamsAFU } from "../subsystems/afu/afu.eval.js";
import { makeNominalParamsTMI } from "../subsystems/tmi/tmi.eval.js";
import { makeNominalParamsMSS } from "../subsystems/mss/mss.eval.js";

export function makeNominalParams(subId){
  const r=(n,k=1)=>Math.round((n+(Math.random()-0.5)*k)*100)/100;
  const ri=(n,k=1)=>Math.round((n+(Math.random()-0.5)*k));
  switch(subId){
    case "eps": return makeNominalParamsEPS();
        case "therm": return makeNominalParamsTHERM();
    case "cndh": return makeNominalParamsCNDH();
    case "suba": return makeNominalParamsSUBA();
        case "tmi": return makeNominalParamsTMI();
        case "ttc": return makeNominalParamsTTC();
    case "mss": return makeNominalParamsMSS();
    case "gnc": return makeNominalParamsGNC();
    case "adcs": return makeNominalParamsADCS();
    case "prop": return makeNominalParamsPROP();
    case "brk": return makeNominalParamsBRK();
    case "afu": return makeNominalParamsAFU();
    default: return { "Параметр": r(0,1) };
  }
}

export function initSat(satNo){
  const subsystems = {};
  for(const sub of SUBSYSTEMS){
    subsystems[sub.id] = { st:"ok", msg:"Норма", params: makeNominalParams(sub.id) };
  }
  // История для листовых форматов СЭС (графики/тренды)
  if(subsystems.eps){
    subsystems.eps.hist = { t: [], sz: [], uakb: [] };
  }

    return {
    sat: satNo,
    plane: satPlane(satNo),
    role: "normal",
    inactive: false,
    link: "ok",
    lastUpdate: nowStamp(),
    lastUpdateMs: Date.now(),
    subsystems
  };
}

export function buildConstellationState(){
  const sats = new Map();
  for(let satNo=1; satNo<=TOTAL_SATS; satNo++){
    sats.set(satNo, initSat(satNo));
  }
  return sats;
}
