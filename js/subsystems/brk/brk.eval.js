import { worst } from "../../core/util.js";
import { TH } from "../../model/thresholds.js";

function isBad(value){
  const s = String(value || "").trim().toLowerCase();
  return (
    s === "ошибка" ||
    s === "нарушена" ||
    s === "нарушен" ||
    s === "потеряна" ||
    s === "отказ" ||
    s === "сработала" ||
    s === "да" ||
    s === "запрещено"
  );
}

function isMissing(value){
  const s = String(value || "").trim().toLowerCase();
  return s === "нет" || isBad(value);
}

export function makeNominalParamsBRK(){
  const r = (n,k=1)=>Math.round((n+(Math.random()-0.5)*k)*100)/100;
  const ri = (n,k=1)=>Math.max(0, Math.round(n+(Math.random()-0.5)*k));

  const beams = Math.max(1, Math.min(8, ri(6,3)));
  const ratePerBeam = Math.min(TH.brk.RATE_PER_BEAM_TARGET_MBPS, Math.max(80, r(155,35)));
  const totalRate = Math.round(beams * ratePerBeam);

  return {
    "Режим БРК": "рабочий режим связи",
    "Диапазон БРК": "Ku/Ka",
    "Состояние модема": "синхронизация установлена",
    "Состояние приёма": "активен",
    "Состояние передачи": "активна",

    "Активные лучи, шт": beams,
    "Скорость на луч, Мбит/с": ratePerBeam,
    "Суммарная скорость, Мбит/с": totalRate,
    "Загрузка БРК, %": Math.min(95, ri(55,25)),

    "Запас радиолинии, дБ": r(9.0,1.0),
    "Вероятность битовой ошибки": 1e-6,
    "Потери пакетов, %": r(0.1,0.2),
    "Ошибки пользовательского обмена, шт": ri(1,3),

    "Выходная мощность передатчика, Вт": r(30,4),
    "Температура БРК, °C": ri(38,8),
    "Авария усилителя мощности": "нет",

    "Телеметрия ПН": "поступает",
    "Квитанции команд БРК": "есть",
    "Ограничение от СЭС": "нет",
    "Ограничение от СУБА": "нет",
  };
}

export function evalBrkStatus(sat){
  const th = TH.brk;

  if(sat.inactive){
    sat.subsystems.brk.st = "inactive";
    sat.subsystems.brk.msg = "Не в эксплуатации";
    return;
  }

  const ageMs = Date.now() - sat.lastUpdateMs;
  if(sat.link !== "ok" || ageMs > 8000){
    sat.subsystems.brk.st = "alarm";
    sat.subsystems.brk.msg = "Нет достоверной ТМИ БРК";
    return;
  }

  const p = sat.subsystems.brk.params || {};

  const epsSt = sat.subsystems?.eps?.st || "ok";
  const subaSt = sat.subsystems?.suba?.st || "ok";

  p["Ограничение от СЭС"] = (epsSt === "warn" || epsSt === "alarm") ? "есть" : "нет";
  p["Ограничение от СУБА"] = (subaSt === "warn" || subaSt === "alarm") ? "есть" : "нет";

  const mode = String(p["Режим БРК"] || "").toLowerCase();
  const modemBad = isBad(p["Состояние модема"]);
  const rxBad = isBad(p["Состояние приёма"]);
  const txBad = isBad(p["Состояние передачи"]);
  const paBad = isBad(p["Авария усилителя мощности"]);
  const tmBad = isMissing(p["Телеметрия ПН"]);
  const ackBad = isMissing(p["Квитанции команд БРК"]);

  const beams = Number(p["Активные лучи, шт"]);
  const ratePerBeam = Number(p["Скорость на луч, Мбит/с"]);
  const linkMargin = Number(p["Запас радиолинии, дБ"]);
  const bitError = Number(p["Вероятность битовой ошибки"]);
  const loss = Number(p["Потери пакетов, %"]);
  const exchangeErr = Number(p["Ошибки пользовательского обмена, шт"]);
  const load = Number(p["Загрузка БРК, %"]);
  const temp = Number(p["Температура БРК, °C"]);

  if(Number.isFinite(beams) && Number.isFinite(ratePerBeam)){
    p["Суммарная скорость, Мбит/с"] = Math.round(beams * ratePerBeam);
  }

  let st = "ok";
  let msg = "Норма";

  if(paBad){
    st = "alarm";
    msg = "Авария усилителя мощности БРК";
  }

  if(st !== "alarm" && modemBad){
    st = "alarm";
    msg = "Потеря синхронизации модема БРК";
  }

  if(st !== "alarm" && rxBad){
    st = "alarm";
    msg = "Нарушение приёма пользовательского канала";
  }

  if(st !== "alarm" && txBad){
    st = "alarm";
    msg = "Нарушение передачи пользовательского канала";
  }

  if(st !== "alarm" && mode.includes("рабоч") && Number.isFinite(beams) && beams <= 0){
    st = "alarm";
    msg = "Нет активных лучей в рабочем режиме БРК";
  }

  if(st !== "alarm" && Number.isFinite(linkMargin) && linkMargin < th.LINK_MARGIN_ALARM_MIN_DB){
    st = "alarm";
    msg = "Недостаточный запас радиолинии БРК";
  }

  if(st !== "alarm" && Number.isFinite(bitError) && bitError > th.BIT_ERROR_ALARM){
    st = "alarm";
    msg = "Высокая вероятность битовой ошибки";
  }

  if(st !== "alarm" && Number.isFinite(loss) && loss > th.PACKET_LOSS_ALARM_PCT){
    st = "alarm";
    msg = "Потери пользовательских пакетов";
  }

  if(st !== "alarm" && Number.isFinite(exchangeErr) && exchangeErr > th.USER_EXCHANGE_ERR_ALARM_MAX){
    st = "alarm";
    msg = "Превышение ошибок пользовательского обмена";
  }

  if(st !== "alarm" && Number.isFinite(load) && load > th.LOAD_ALARM_MAX_PCT){
    st = "alarm";
    msg = "Перегрузка БРК";
  }

  if(st !== "alarm" && Number.isFinite(temp) && temp > th.TEMP_ALARM_MAX_C){
    st = "alarm";
    msg = "Перегрев БРК";
  }

  if(st !== "alarm"){
    if(Number.isFinite(linkMargin) && linkMargin < th.LINK_MARGIN_OK_MIN_DB){
      st = worst(st,"warn");
      msg = "Снижение запаса радиолинии БРК";
    }

    if(Number.isFinite(bitError) && bitError > th.BIT_ERROR_WARN){
      st = worst(st,"warn");
      msg = "Рост вероятности битовой ошибки";
    }

    if(Number.isFinite(loss) && loss > th.PACKET_LOSS_WARN_PCT){
      st = worst(st,"warn");
      msg = "Рост потерь пользовательских пакетов";
    }

    if(Number.isFinite(exchangeErr) && exchangeErr > th.USER_EXCHANGE_ERR_WARN_MAX){
      st = worst(st,"warn");
      msg = "Рост ошибок пользовательского обмена";
    }

    if(Number.isFinite(load) && load > th.LOAD_WARN_MAX_PCT){
      st = worst(st,"warn");
      msg = "Повышенная загрузка БРК";
    }

    if(Number.isFinite(temp) && temp > th.TEMP_WARN_MAX_C){
      st = worst(st,"warn");
      msg = "Повышенная температура БРК";
    }

    if(tmBad){
      st = worst(st,"warn");
      msg = "Нет подтверждения телеметрии полезной нагрузки";
    }

    if(ackBad){
      st = worst(st,"warn");
      msg = "Нет квитанций команд БРК";
    }

    if(p["Ограничение от СЭС"] === "есть"){
      st = worst(st,"warn");
      msg = "БРК ограничен по состоянию СЭС";
    }

    if(p["Ограничение от СУБА"] === "есть"){
      st = worst(st,"warn");
      msg = "БРК ограничен по состоянию СУБА";
    }
  }

  sat.subsystems.brk.st = st;
  sat.subsystems.brk.msg = msg;
}