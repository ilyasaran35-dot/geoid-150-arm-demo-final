import { worst } from "../../core/util.js";
import { TH } from "../../model/thresholds.js";

export function makeNominalParamsTTC(){
  const r = (n,k=1)=>Math.round((n+(Math.random()-0.5)*k)*100)/100;
  const ri = (n,k=1)=>Math.max(0, Math.round(n+(Math.random()-0.5)*k));

  return {
    "Режим ССКУ": Math.random() < 0.75 ? "дежурный" : "сеансный",
    "Состояние канала ТМ/КИ": "установлен",
    "Уровень принимаемого сигнала, дБм": r(-82,3),
    "Скорость передачи ТМИ, кбит/с": ri(420,80),
    "Ошибки контроля целостности, шт": 0,
    "Превышения времени ожидания, шт": 0,
    "Повторы передачи, шт": 0,
    "Синхронизация времени": "норма",
    "Приём командной информации": "разрешён",
    "Передача ТМИ": "активна",
    "Квитанции команд": "есть",
  };
}

function isBad(value){
  const s = String(value || "").trim().toLowerCase();
  return s === "нет" || s === "ошибка" || s === "нарушен" || s === "разомкнут" || s === "запрещён";
}

export function evalTtcStatus(sat){
  const th = TH.ttc;

  if(sat.inactive){
    sat.subsystems.ttc.st = "inactive";
    sat.subsystems.ttc.msg = "Не в эксплуатации";
    return;
  }

  const ageMs = Date.now() - sat.lastUpdateMs;
  if(sat.link !== "ok" || ageMs > th.AGE_ALARM_MS){
    sat.subsystems.ttc.st = "alarm";
    sat.subsystems.ttc.msg = "Нет достоверной ТМИ ССКУ";
    return;
  }

  const p = sat.subsystems.ttc.params || {};

  const sig = Number(p["Уровень принимаемого сигнала, дБм"]);
  const integrity = Number(p["Ошибки контроля целостности, шт"]);
  const wait = Number(p["Превышения времени ожидания, шт"]);
  const retry = Number(p["Повторы передачи, шт"]);

  const channelBad = isBad(p["Состояние канала ТМ/КИ"]);
  const timeBad = isBad(p["Синхронизация времени"]);
  const cmdBad = isBad(p["Приём командной информации"]);
  const tmBad = isBad(p["Передача ТМИ"]);
  const ackBad = isBad(p["Квитанции команд"]);

  let st = "ok";
  let msg = "Норма";

  if(channelBad){
    st = "alarm";
    msg = "Нарушение канала ТМ/КИ";
  }

  if(st !== "alarm" && Number.isFinite(sig) && sig < th.SIGNAL_WARN_MIN_DBM){
    st = "alarm";
    msg = "Недопустимо низкий уровень принимаемого сигнала";
  }

  if(st !== "alarm" && Number.isFinite(integrity) && integrity > th.INTEGRITY_ALARM_MAX){
    st = "alarm";
    msg = "Превышение ошибок контроля целостности";
  }

  if(st !== "alarm" && Number.isFinite(wait) && wait > th.WAIT_ALARM_MAX){
    st = "alarm";
    msg = "Превышение времени ожидания обмена";
  }

  if(st !== "alarm" && Number.isFinite(retry) && retry > th.RETRY_ALARM_MAX){
    st = "alarm";
    msg = "Чрезмерное число повторов передачи";
  }

  if(st !== "alarm" && th.TIME_SYNC_REQUIRED && timeBad){
    st = "alarm";
    msg = "Нарушение синхронизации времени";
  }

  if(st !== "alarm" && tmBad){
    st = "alarm";
    msg = "Передача ТМИ не подтверждена";
  }

  if(st !== "alarm"){
    if(Number.isFinite(sig) && sig < th.SIGNAL_OK_MIN_DBM){
      st = worst(st,"warn");
      msg = "Пониженный уровень принимаемого сигнала";
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
      msg = "Рост повторов передачи";
    }

    if(cmdBad){
      st = worst(st,"warn");
      msg = "Приём командной информации ограничен";
    }

    if(ackBad){
      st = worst(st,"warn");
      msg = "Нет квитанций команд";
    }
  }

  sat.subsystems.ttc.st = st;
  sat.subsystems.ttc.msg = msg;
}