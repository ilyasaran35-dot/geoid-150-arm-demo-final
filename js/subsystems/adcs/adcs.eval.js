import { worst } from "../../core/util.js";
import { TH } from "../../model/thresholds.js";

function yes(value){
  const s = String(value || "").trim().toLowerCase();
  return s === "да" || s === "есть" || s === "сработал" || s === "сработала" || s === "запрещён" || s === "запрещена";
}

function isBad(value){
  const s = String(value || "").trim().toLowerCase();
  return s === "отказ" || s === "ошибка" || s === "нарушен" || s === "нарушена" || s === "не готов" || s === "не готовы";
}

function maxAbs(values){
  const nums = values.map(v=>Number(v)).filter(Number.isFinite).map(Math.abs);
  return nums.length ? Math.max(...nums) : null;
}

function round2(x){
  return Math.round(x * 100) / 100;
}

function sensorSummary(star, sun, gyro, ban){
  if(ban) return { st:"alarm", loop:"запрет", msg:"запрещено использование датчиков ориентации" };
  if(gyro < TH.adcs.GYRO_VALID_WARN_MIN) return { st:"alarm", loop:"нет", msg:"недостаточно валидных измерений гиродатчиков" };
  if(star >= TH.adcs.STAR_VALID_OK_MIN && gyro >= TH.adcs.GYRO_VALID_OK_MIN){
    return { st:"ok", loop:"ГД", msg:"точный контур ориентации готов" };
  }
  if(sun >= TH.adcs.SUN_VALID_WARN_MIN && gyro >= TH.adcs.GYRO_VALID_WARN_MIN){
    return { st:"warn", loop:"СГ", msg:"точный контур ограничен, используется грубый солнечно-гироскопический контур" };
  }
  return { st:"alarm", loop:"нет", msg:"нет достаточного набора валидных измерений ориентации" };
}

export function makeNominalParamsADCS(){
  const r = (n,k=1)=>Math.round((n+(Math.random()-0.5)*k)*100)/100;
  const ri = (n,k=1)=>Math.max(0, Math.round(n+(Math.random()-0.5)*k));

  const gx = ri(22,18);
  const gy = ri(18,16);
  const gz = ri(25,18);
  const gmax = Math.max(Math.abs(gx), Math.abs(gy), Math.abs(gz));

  return {
    "Режим ориентации": "трёхосная ориентация",
    "Состояние автомата ориентации": "штатная ориентация",
    "Контур управления": "ГД",
    "Приоритет контуров": "ГД → СГ",
    "Источник ориентации": "звёздные датчики + гиродатчики",

    "Готовность точной ориентации": "готова",
    "Валидные звёздные измерения, шт": ri(2,1),
    "Валидные солнечные измерения, шт": ri(1,1),
    "Валидные измерения гиродатчиков, шт": ri(3,1),
    "СКО определения ориентации, угл.сек": r(10,6),
    "Ошибка ориентации, угл.сек": r(18,18),
    "Угловая скорость, град/с": r(0.02,0.04),
    "Возраст решения ориентации, мс": ri(900,500),

    "Состояние звёздных датчиков": "норма",
    "Состояние солнечных датчиков": "норма",
    "Состояние гиродатчиков": "норма",
    "Запрет датчиков ориентации": "нет",

    "Готовность маховиков": "готовы",
    "Исполнительный контур": "маховики",
    "Gx, %": gx,
    "Gy, %": gy,
    "Gz, %": gz,
    "Gmax, %": gmax,
    "Насыщение маховиков": "нет",
    "Разгрузка кинетического момента": "нет",
    "Разрешение разгрузки": "разрешена",
    "Запрет исполнительных органов": "нет",
    "Причина перехода режима": "нет",
  };
}

export function evalAdcsStatus(sat){
  const th = TH.adcs;

  if(sat.inactive){
    sat.subsystems.adcs.st = "inactive";
    sat.subsystems.adcs.msg = "Не в эксплуатации";
    return;
  }

  const ageMs = Date.now() - sat.lastUpdateMs;
  if(sat.link !== "ok" || ageMs > th.ORIENT_AGE_ALARM_MS){
    sat.subsystems.adcs.st = "alarm";
    sat.subsystems.adcs.msg = "Нет достоверной ТМИ СУДН";
    return;
  }

  const p = sat.subsystems.adcs.params || {};

  p["Возраст решения ориентации, мс"] = Math.max(0, Math.round(ageMs));

  const attErr = Number(p["Ошибка ориентации, угл.сек"]);
  const sigma = Number(p["СКО определения ориентации, угл.сек"]);
  const rate = Number(p["Угловая скорость, град/с"]);

  const star = Number(p["Валидные звёздные измерения, шт"]);
  const sun = Number(p["Валидные солнечные измерения, шт"]);
  const gyro = Number(p["Валидные измерения гиродатчиков, шт"]);

  const banSensors = yes(p["Запрет датчиков ориентации"]);
  const banActuators = yes(p["Запрет исполнительных органов"]);
  const unloadDenied = String(p["Разрешение разгрузки"] || "разрешена").trim().toLowerCase() === "запрещена";

  const gmax = maxAbs([p["Gx, %"], p["Gy, %"], p["Gz, %"]]);
  if(gmax != null) p["Gmax, %"] = Math.round(gmax);

  const sensors = sensorSummary(star, sun, gyro, banSensors);
  p["Контур управления"] = sensors.loop;
  p["Готовность точной ориентации"] = sensors.st === "ok" ? "готова" : sensors.st === "warn" ? "ограничена" : "не готова";

  const wheelsBad = isBad(p["Готовность маховиков"]);
  const wheelSaturation = yes(p["Насыщение маховиков"]) || (Number.isFinite(gmax) && gmax >= th.MOMENT_ALARM_PCT);
  const unloadActive = yes(p["Разгрузка кинетического момента"]) || (Number.isFinite(gmax) && gmax >= th.MOMENT_UNLOAD_START_PCT);

  if(Number.isFinite(gmax)){
    p["Насыщение маховиков"] = gmax >= th.MOMENT_ALARM_PCT ? "есть" : "нет";
    if(gmax >= th.MOMENT_UNLOAD_START_PCT && !unloadDenied){
      p["Разгрузка кинетического момента"] = "идёт";
    }
  }

  let mode = "трёхосная ориентация";
  let auto = "штатная ориентация";

  if(banActuators || sensors.st === "alarm"){
    mode = "безопасная ориентация";
    auto = "безопасный режим";
  }else if(Number.isFinite(rate) && rate > th.RATE_ALARM_DPS){
    mode = "гашение угловых скоростей";
    auto = "гашение угловых скоростей";
  }else if(unloadActive){
    mode = "разгрузка кинетического момента";
    auto = "разгрузка";
  }

  p["Режим ориентации"] = mode;
  p["Состояние автомата ориентации"] = auto;

  let st = "ok";
  let msg = "Норма";

  if(banActuators){
    st = "alarm";
    msg = "Запрещены исполнительные органы ориентации";
  }

  if(st !== "alarm" && sensors.st === "alarm"){
    st = "alarm";
    msg = sensors.msg;
  }

  if(st !== "alarm" && wheelsBad){
    st = "alarm";
    msg = "Маховики не готовы";
  }

  if(st !== "alarm" && Number.isFinite(rate) && rate > th.RATE_ALARM_DPS){
    st = "alarm";
    msg = "Высокая угловая скорость КА";
  }

  if(st !== "alarm" && Number.isFinite(attErr) && attErr > th.ATT_ERR_ALARM_ARCSEC){
    st = "alarm";
    msg = "Ошибка ориентации выше аварийного порога";
  }

  if(st !== "alarm" && Number.isFinite(sigma) && sigma > th.ATT_SIGMA_ALARM_ARCSEC){
    st = "alarm";
    msg = "Недостаточная точность определения ориентации";
  }

  if(st !== "alarm" && wheelSaturation){
    st = "alarm";
    msg = "Насыщение маховиков";
  }

  if(st !== "alarm" && unloadActive && unloadDenied){
    st = "alarm";
    msg = "Требуется разгрузка, но разгрузка запрещена";
  }

  if(st !== "alarm"){
    if(sensors.st === "warn"){
      st = worst(st, "warn");
      msg = sensors.msg;
    }

    if(ageMs > th.ORIENT_AGE_WARN_MS){
      st = worst(st, "warn");
      msg = "Рост возраста решения ориентации";
    }

    if(Number.isFinite(attErr) && attErr > th.ATT_ERR_WARN_ARCSEC){
      st = worst(st, "warn");
      msg = "Рост ошибки ориентации";
    }

    if(Number.isFinite(sigma) && sigma > th.ATT_SIGMA_WARN_ARCSEC){
      st = worst(st, "warn");
      msg = "Снижение точности определения ориентации";
    }

    if(Number.isFinite(rate) && rate > th.RATE_WARN_DPS){
      st = worst(st, "warn");
      msg = "Рост угловой скорости";
    }

    if(Number.isFinite(gmax) && gmax >= th.MOMENT_WARN_PCT){
      st = worst(st, "warn");
      msg = "Рост кинетического момента маховиков";
    }

    if(unloadActive){
      st = worst(st, "warn");
      msg = "Идёт разгрузка кинетического момента";
    }
  }

  p["Причина перехода режима"] = msg === "Норма" ? "нет" : msg;

  sat.subsystems.adcs._detail = {
    sensors,
    gmax,
    stateMachine: {
      state: auto,
      priority: "безопасная ориентация → гашение угловых скоростей → разгрузка → трёхосная ориентация"
    },
    timeSource: th.TIME_SOURCE
  };

  sat.subsystems.adcs.st = st;
  sat.subsystems.adcs.msg = msg;
}
