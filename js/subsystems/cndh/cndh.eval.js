import { worst } from "../../core/util.js";
import { TH } from "../../model/thresholds.js";

export function makeNominalParamsCNDH(){
  const ri = (n,k=1)=>Math.max(0, Math.round(n + (Math.random()-0.5)*k));

  return {
    "Активный комплект БВС": Math.random() < 0.88 ? "основной" : "резервный",
    "Резервный комплект БВС": "готов",
    "Загрузка БВС, %": ri(35,20),
    "Использование памяти БВС, %": ri(45,25),
    "Сторожевой контроль БКУ": "норма",
    "Контроль целостности ПО": "норма",
    "Температура БКУ, °C": ri(35,12),
    "Режим БКУ": "штатный",
    "Конфигурация БВС": "штатная",
    "Перезапуск ПО": "нет",
    "Переключение на резерв": "нет",
  };
}

function isBad(value){
  const s = String(value || "").trim().toLowerCase();
  return s === "сработал" || s === "ошибка" || s === "было" || s === "был" || s === "не готов";
}

export function evalCndhStatus(sat){
  const th = TH.cndh;

  if(sat.inactive){
    sat.subsystems.cndh.st = "inactive";
    sat.subsystems.cndh.msg = "Не в эксплуатации";
    return;
  }

  const ageMs = Date.now() - sat.lastUpdateMs;
  if(sat.link !== "ok" || ageMs > 8000){
    sat.subsystems.cndh.st = "alarm";
    sat.subsystems.cndh.msg = "Нет достоверной ТМИ БКУ/БВС";
    return;
  }

  const p = sat.subsystems.cndh.params || {};

  const load = Number(p["Загрузка БВС, %"]);
  const mem = Number(p["Использование памяти БВС, %"]);

  const watchdog = isBad(p["Сторожевой контроль БКУ"]);
  const swIntegrity = isBad(p["Контроль целостности ПО"]);
  const reserveNotReady = String(p["Резервный комплект БВС"] || "").toLowerCase() === "не готов";
  const reboot = isBad(p["Перезапуск ПО"]);
  const switched = isBad(p["Переключение на резерв"]);
  const configLost = String(p["Конфигурация БВС"] || "").toLowerCase() !== "штатная";

  let st = "ok";
  let msg = "Норма";

  if(th.WDT_ALARM && watchdog){
    st = "alarm";
    msg = "Сработал сторожевой контроль БКУ";
  }

  if(th.SW_CRC_ALARM && swIntegrity){
    st = "alarm";
    msg = "Ошибка контроля целостности ПО";
  }

  if(st !== "alarm"){
    if(Number.isFinite(load)){
      if(load > th.CPU_ALARM_PCT){
        st = "alarm";
        msg = "Перегрузка БВС";
      }else if(load > th.CPU_WARN_PCT){
        st = worst(st,"warn");
        msg = "Повышенная загрузка БВС";
      }
    }

    if(Number.isFinite(mem)){
      if(mem > th.MEM_ALARM_PCT){
        st = "alarm";
        msg = "Недопустимое использование памяти БВС";
      }else if(mem > th.MEM_WARN_PCT){
        st = worst(st,"warn");
        msg = "Повышенное использование памяти БВС";
      }
    }

    if(reserveNotReady){
      st = worst(st,"warn");
      msg = "Резервный комплект БВС не готов";
    }

    if(reboot){
      st = worst(st,"warn");
      msg = "Зафиксирован перезапуск ПО";
    }

    if(switched){
      st = worst(st,"warn");
      msg = "Зафиксирован переход на резерв";
    }

    if(configLost){
      st = worst(st,"warn");
      msg = "Потеря штатной конфигурации БВС";
    }
  }

  sat.subsystems.cndh.st = st;
  sat.subsystems.cndh.msg = msg;
}