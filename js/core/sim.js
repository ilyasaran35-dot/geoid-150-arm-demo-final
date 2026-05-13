import { TOTAL_SATS, TOTAL_PLANES, SATS_PER_PLANE, satRangeForPlane } from "../model/constell.js";
import { SUBSYSTEMS, evalSubsystemStatus } from "./registry.js";
import { nowStamp } from "./util.js";
import { makeNominalParams } from "../model/satModel.js";

export const SIM = {
  // В штатном режиме группировка большую часть времени работает без аварий.
  // Инциденты очень редкие, локальные, без лавинообразного накопления.
  PROB_TMI_LOSS: 0.0000002,
  PROB_RECOVER: 0.22,
  PROB_ISSUE: 0.0000025,
  PROB_RECOVER_SUB: 0.03,
  ISSUE_COOLDOWN_MS: 420000,
  MAX_BAD_SUBSYSTEMS_PER_SAT: 1
};

let journalTickTag = 0;

function statusWord(st){
  if(st === "alarm") return "Авария";
  if(st === "warn") return "Предупреждение";
  if(st === "inactive") return "Не в эксплуатации";
  return "Норма";
}

function pushJournalEvent(events, sat, subId, level, text){
  events.unshift({
    ts: nowStamp(),
    sat: sat.sat,
    plane: sat.plane,
    sub: subsystemLabel(subId),
    level,
    text
  });
  if(events.length > 250) events.pop();
}

function markJournalLogged(s, subId){
  if(!s?.subsystems?.[subId]) return;
  s.subsystems[subId]._lastJournalTick = journalTickTag;
  s.subsystems[subId]._journalSeen = true;
}

function syncSubsystemJournal(s, events, prevStates){
  for(const sub of SUBSYSTEMS){
    const subId = sub.id;
    const cur = s.subsystems?.[subId];
    if(!cur) continue;

    const afterSt = cur.st || "ok";
    const beforeSt = prevStates[subId];
    const alreadyLogged = cur._lastJournalTick === journalTickTag;

    if(cur._journalSeen !== true){
      cur._journalSeen = true;
      if(afterSt !== "ok" && afterSt !== "inactive" && !alreadyLogged){
        pushJournalEvent(events, s, subId, afterSt, `Текущее состояние: ${cur.msg || statusWord(afterSt)}`);
        markJournalLogged(s, subId);
      }
      continue;
    }

    if(beforeSt === afterSt) continue;
    if(alreadyLogged) continue;
    if(afterSt === "inactive") continue;

    const text = afterSt === "ok"
      ? `Состояние изменилось: ${statusWord(beforeSt)} → Норма`
      : `Состояние изменилось: ${statusWord(beforeSt)} → ${statusWord(afterSt)}${cur.msg ? ` (${cur.msg})` : ""}`;

    pushJournalEvent(events, s, subId, afterSt, text);
    markJournalLogged(s, subId);
  }
}

function assignNodeRoles(sats){
  const slot = Math.floor(Date.now() / 20000);

  for(let satNo = 1; satNo <= TOTAL_SATS; satNo++){
    const s = sats.get(satNo);
    if(s) s.role = "normal";
  }

  for(let plane = 1; plane <= TOTAL_PLANES; plane++){
    const { start } = satRangeForPlane(plane);
    const offset = (slot + plane - 1) % SATS_PER_PLANE;
    const nodeSat = start + offset;
    const s = sats.get(nodeSat);
    if(s) s.role = "node";
  }
}

function randomChoice(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

function subsystemLabel(subId){
  const meta = SUBSYSTEMS.find(x => x.id === subId);
  return meta?.name || subId;
}

function randomIssueText(subId, level){
  const map={
    eps:["Низкий заряд АКБ","Ограничение нагрузки","Дефицит мощности","Просадка шины"],
    therm:["Рост температуры БРК/АФУ","Переохлаждение АКБ","Снижение достоверности температурных датчиков","Отказ управления нагревателями","Снижение эффективности радиатора полезной нагрузки"],
  tmi:["Рост ошибок контроля целостности","Повторы кадров","Снижение полноты ТМИ","Превышение времени ожидания ТМИ"],
    cndh:["Повышенная загрузка БВС","Ошибка использования памяти БВС","Сработал сторожевой контроль БКУ","Переход на резервный комплект"],
    suba:["Рост ошибок CAN","Повторы по внутреннему интерфейсу","Отключение шины CAN","Срабатывание защиты фидера БРК/АФУ"],
       ttc:["Превышения времени ожидания ТМ/КИ","Нарушение синхронизации времени","Рост ошибок контроля целостности"],
    mss:["Рост задержки МСС","Повторы по МСС","Потери пакетов МСС","Потеря захвата соседнего КА","Нарушение маршрутизации МСС"],
    gnc:["Снижение точности навигации","Снижение готовности навигационного решения","Расхождение ΔV коррекции орбиты","Зависание признака манёвра"],
    adcs:["Рост ошибки ориентации","Рост угловой скорости","Насыщение маховиков","Снижение готовности датчиков ориентации","Запрет исполнительных органов"],
    prop:["Снижение давления рабочего тела","Рост температуры ДУ","Расхождение ΔV импульса","Отказ клапана подачи","Запрет ДУ"],
    brk:["Снижение запаса радиолинии","Потеря синхронизации модема","Рост вероятности битовой ошибки","Авария усилителя мощности","Потери пользовательских пакетов"],
    afu:["Рост ошибки наведения луча","Рост КСВН","Нарушение тракта S/Ku/Ka","Отказ МШУ","Отклонение мощности АФУ"],
  };
  const arr=map[subId]||["Отклонение"];
  return randomChoice(arr) + (level==="alarm"?" (крит.)":"");
}

function tweakParamsForEvent(s, subId, level){
  const p=s.subsystems[subId].params;
  if(!p) return;
  const r=(n,k=1)=>Math.round((n+(Math.random()-0.5)*k)*100)/100;

  if(subId==="eps"){
    if(level==="warn"){
      p["Uш, В"] = Math.max(25.4, Number(p["Uш, В"]) - (Math.random()*1.0 + 0.6));
      p["СЗ АКБ, %"] = Math.max(35, Number(p["СЗ АКБ, %"]) - (Math.random()*12 + 8));
      p["Pнаг, Вт"] = Math.round(Number(p["Pнаг, Вт"] || 0) + Math.random()*80 + 30);
      p["Режим СЭС"] = "ограничение нагрузки";
    }else{
      p["Uш, В"] = Math.max(23.8, Number(p["Uш, В"]) - (Math.random()*2.2 + 1.4));
      p["СЗ АКБ, %"] = Math.max(18, Number(p["СЗ АКБ, %"]) - (Math.random()*22 + 18));
      p["Pнаг, Вт"] = Math.round(Number(p["Pнаг, Вт"] || 0) + Math.random()*130 + 80);
      p["Режим СЭС"] = "ограничение нагрузки";
      if(Math.random() < 0.25) p["Защита АКБ"] = "да";
    }
    const pGen = Number(p["Pген, Вт"]);
    const pNag = Number(p["Pнаг, Вт"]);
    if(Number.isFinite(pGen) && Number.isFinite(pNag)) p["Pбал, Вт"] = Math.round(pGen - pNag);
  }
    if(subId==="tmi"){
    const add=(k, m)=>{ p[k]=(Number(p[k]) || 0) + m; };

    if(level==="warn"){
      p["Полнота кадров, %"] = Math.max(88, Number(p["Полнота кадров, %"] || 99) - Math.round(Math.random()*5 + 3));
      p["Достоверные параметры, %"] = Math.max(94, Number(p["Достоверные параметры, %"] || 99) - Math.round(Math.random()*3 + 1));
      add("Недостоверные параметры, шт", Math.round(Math.random()*4 + 1));
      add("Ошибки контроля целостности, шт", Math.round(Math.random()*4 + 1));
      add("Превышения времени ожидания, шт", Math.round(Math.random()*2 + 1));
      add("Повторы кадров, шт", Math.round(Math.random()*5 + 2));
      add("Потерянные кадры, шт", Math.round(Math.random()*4 + 1));
      p["Пригодность ТМИ для контроля"] = "ограниченно пригодна";
    }else{
      p["Полнота кадров, %"] = Math.max(70, Number(p["Полнота кадров, %"] || 99) - Math.round(Math.random()*15 + 12));
      p["Достоверные параметры, %"] = Math.max(80, Number(p["Достоверные параметры, %"] || 99) - Math.round(Math.random()*10 + 8));
      add("Недостоверные параметры, шт", Math.round(Math.random()*12 + 8));
      add("Ошибки контроля целостности, шт", Math.round(Math.random()*12 + 8));
      add("Превышения времени ожидания, шт", Math.round(Math.random()*8 + 5));
      add("Повторы кадров, шт", Math.round(Math.random()*15 + 8));
      add("Потерянные кадры, шт", Math.round(Math.random()*20 + 10));
      p["Синхронизация времени"] = Math.random() < 0.45 ? "нарушена" : "норма";
      p["Буферизация ТМИ"] = Math.random() < 0.35 ? "переполнение" : "норма";
      p["Пригодность ТМИ для контроля"] = "непригодна";
    }
  }
    if(subId==="cndh"){
    if(level==="warn"){
      p["Загрузка БВС, %"] = Math.min(88, Math.max(Number(p["Загрузка БВС, %"] || 0), Math.round(76 + Math.random()*10)));
      p["Использование памяти БВС, %"] = Math.min(90, Math.max(Number(p["Использование памяти БВС, %"] || 0), Math.round(82 + Math.random()*8)));
      if(Math.random() < 0.25) p["Перезапуск ПО"] = "был";
      if(Math.random() < 0.20) p["Переключение на резерв"] = "было";
    }else{
      p["Загрузка БВС, %"] = Math.round(91 + Math.random()*8);
      p["Использование памяти БВС, %"] = Math.round(93 + Math.random()*6);
      if(Math.random() < 0.45) p["Сторожевой контроль БКУ"] = "сработал";
      if(Math.random() < 0.35) p["Контроль целостности ПО"] = "ошибка";
      if(Math.random() < 0.45) p["Переключение на резерв"] = "было";
      if(Math.random() < 0.45) p["Активный комплект БВС"] = "резервный";
      if(Math.random() < 0.25) p["Резервный комплект БВС"] = "не готов";
      p["Конфигурация БВС"] = "нештатная";
    }
  }
   if(subId==="ttc"){
    p["Превышения времени ожидания, шт"] =
      (p["Превышения времени ожидания, шт"] || 0) +
      (level==="warn" ? Math.round(Math.random()*6+2) : Math.round(Math.random()*18+8));

    p["Ошибки контроля целостности, шт"] =
      (p["Ошибки контроля целостности, шт"] || 0) +
      (level==="warn" ? Math.round(Math.random()*3+1) : Math.round(Math.random()*9+4));

    p["Повторы передачи, шт"] =
      (p["Повторы передачи, шт"] || 0) +
      (level==="warn" ? Math.round(Math.random()*4+1) : Math.round(Math.random()*10+5));

    p["Уровень принимаемого сигнала, дБм"] =
      Number(p["Уровень принимаемого сигнала, дБм"] || -82) -
      (level==="warn" ? Math.round(Math.random()*4+2) : Math.round(Math.random()*9+6));

    if(level==="warn"){
      p["Синхронизация времени"] = "норма";
      p["Состояние канала ТМ/КИ"] = "установлен";
    }else{
      p["Синхронизация времени"] = "нет";
      p["Состояние канала ТМ/КИ"] = "нарушен";
      p["Передача ТМИ"] = "нет";
      if(Math.random() < 0.5) p["Квитанции команд"] = "нет";
    }
  }

  if(subId==="mss"){
    const add=(k, m)=>{ p[k]=(Number(p[k]) || 0) + m; };

    if(level==="warn"){
      add("Повторы вперёд, шт", Math.round(Math.random()*4+2));
      add("Повторы назад, шт", Math.round(Math.random()*4+1));
      add("Задержка вперёд, мс", Math.round(Math.random()*60+20));
      add("Задержка назад, мс", Math.round(Math.random()*40+15));

      if(Math.random() < 0.15) p["Захват вперёд"] = "поиск";
      if(Math.random() < 0.20) p["Транзит ТМ/КИ через КА, кбит/с"] =
        (Number(p["Транзит ТМ/КИ через КА, кбит/с"]) || 900) + Math.round(Math.random()*700 + 500);

    }else{
      add("Потери пакетов вперёд, шт", Math.round(Math.random()*6+3));
      add("Потери пакетов назад, шт", Math.round(Math.random()*6+3));
      add("Задержка вперёд, мс", Math.round(Math.random()*160+80));
      add("Задержка назад, мс", Math.round(Math.random()*160+80));

      if(Math.random() < 0.45) p["Терминал вперёд"] = "не готов";
      if(Math.random() < 0.45) p["Терминал назад"] = "не готов";
      if(Math.random() < 0.35) p["Захват вперёд"] = "захват потерян";
      if(Math.random() < 0.35) p["Захват назад"] = "захват потерян";
      if(Math.random() < 0.35) p["Нарушение маршрутизации"] = "да";

      p["Транзит ТМ/КИ через КА, кбит/с"] =
        (Number(p["Транзит ТМ/КИ через КА, кбит/с"]) || 900) + Math.round(Math.random()*1600 + 1200);
    }
  }

  if(subId==="gnc"){
    if(level==="warn"){
      p["СКО положения, м"] = Math.min(180, (Number(p["СКО положения, м"]) || 35) + Math.round(Math.random()*60+30));
      p["СКО скорости, м/с"] = Math.min(0.18, (Number(p["СКО скорости, м/с"]) || 0.04) + Math.random()*0.08);
      p["Валидные навигационные измерения, шт"] = Math.max(3, Number(p["Валидные навигационные измерения, шт"] || 5) - 1);
      p["Готовность навигационного решения"] = "ограничено";
      p["Флаг коррекции орбиты"] = "есть";
      p["Тип коррекции"] = "эксплуатационная";
      p["Таймер до манёвра, с"] = Math.round(Math.random()*600+120);
      p["Плановое ΔV, мм/с"] = Math.round(Math.random()*80+20);
      p["Фактическое ΔV, мм/с"] = Math.max(0, p["Плановое ΔV, мм/с"] - Math.round(Math.random()*25));
    }else{
      p["СКО положения, м"] = Math.min(400, (Number(p["СКО положения, м"]) || 80) + Math.round(Math.random()*200+120));
      p["СКО скорости, м/с"] = Math.min(0.45, (Number(p["СКО скорости, м/с"]) || 0.08) + Math.random()*0.30);
      p["Валидные навигационные измерения, шт"] = Math.max(0, Math.round(Math.random()*2));
      p["Готовность навигационного решения"] = "не готово";
      p["Флаг коррекции орбиты"] = "есть";
      p["Манёвр коррекции"] = "идёт";
      p["Тип коррекции"] = Math.random() < 0.5 ? "эксплуатационная" : "деорбитация";
      p["Таймер до манёвра, с"] = 0;
      p["Таймер после манёвра, с"] = 0;
      p["Плановое ΔV, мм/с"] = Math.round(Math.random()*120+60);
      p["Фактическое ΔV, мм/с"] = Math.max(0, p["Плановое ΔV, мм/с"] - Math.round(Math.random()*90+40));
    }
  }
  if(subId==="adcs"){
    if(level==="warn"){
      p["Ошибка ориентации, угл.сек"] =
        Math.min(150, (Number(p["Ошибка ориентации, угл.сек"]) || 25) + Math.round(Math.random()*70+30));

      p["СКО определения ориентации, угл.сек"] =
        Math.min(70, (Number(p["СКО определения ориентации, угл.сек"]) || 12) + Math.round(Math.random()*30+15));

      p["Угловая скорость, град/с"] =
        Math.min(0.28, (Number(p["Угловая скорость, град/с"]) || 0.03) + Math.random()*0.14);

      p["Gx, %"] = Math.min(88, (Number(p["Gx, %"]) || 25) + Math.round(Math.random()*30+20));
      p["Gy, %"] = Math.min(88, (Number(p["Gy, %"]) || 20) + Math.round(Math.random()*25+15));
      p["Gz, %"] = Math.min(88, (Number(p["Gz, %"]) || 25) + Math.round(Math.random()*30+18));
      p["Gmax, %"] = Math.max(Math.abs(Number(p["Gx, %"]) || 0), Math.abs(Number(p["Gy, %"]) || 0), Math.abs(Number(p["Gz, %"]) || 0));

      if(Number(p["Gmax, %"]) >= 80) p["Разгрузка кинетического момента"] = "идёт";
      if(Math.random() < 0.20) p["Валидные звёздные измерения, шт"] = 0;
      if(Math.random() < 0.20) p["Контур управления"] = "СГ";

    }else{
      p["Ошибка ориентации, угл.сек"] =
        Math.min(280, (Number(p["Ошибка ориентации, угл.сек"]) || 80) + Math.round(Math.random()*160+90));

      p["СКО определения ориентации, угл.сек"] =
        Math.min(140, (Number(p["СКО определения ориентации, угл.сек"]) || 40) + Math.round(Math.random()*80+40));

      p["Угловая скорость, град/с"] =
        Math.min(0.75, (Number(p["Угловая скорость, град/с"]) || 0.12) + Math.random()*0.55);

      p["Валидные звёздные измерения, шт"] = Math.random() < 0.50 ? 0 : Number(p["Валидные звёздные измерения, шт"] || 1);
      p["Валидные измерения гиродатчиков, шт"] = Math.random() < 0.35 ? 1 : Number(p["Валидные измерения гиродатчиков, шт"] || 3);

      p["Gx, %"] = Math.min(100, (Number(p["Gx, %"]) || 70) + Math.round(Math.random()*30+20));
      p["Gy, %"] = Math.min(100, (Number(p["Gy, %"]) || 65) + Math.round(Math.random()*30+20));
      p["Gz, %"] = Math.min(100, (Number(p["Gz, %"]) || 70) + Math.round(Math.random()*30+20));
      p["Gmax, %"] = Math.max(Math.abs(Number(p["Gx, %"]) || 0), Math.abs(Number(p["Gy, %"]) || 0), Math.abs(Number(p["Gz, %"]) || 0));

      p["Насыщение маховиков"] = Number(p["Gmax, %"]) >= 95 ? "есть" : "нет";
      p["Разгрузка кинетического момента"] = "идёт";

      if(Math.random() < 0.25) p["Запрет исполнительных органов"] = "да";
      if(Math.random() < 0.25) p["Разрешение разгрузки"] = "запрещена";
    }
  }
  if(subId==="therm"){
    const heat=(k, m)=>{ p[k] = Math.round((Number(p[k]) || 25) + m); };
    const cool=(k, m)=>{ p[k] = Math.round((Number(p[k]) || 25) - m); };

    if(level==="warn"){
      p["Режим СОТР"] = "штатное терморегулирование";
      p["Алгоритм СОТР"] = "автоматический контроль температур";

      if(Math.random() < 0.55){
        heat("Температура БРК, °C", Math.random()*14 + 8);
        heat("Температура АФУ, °C", Math.random()*12 + 6);
        p["Радиатор полезной нагрузки"] = Math.random() < 0.35 ? "снижена эффективность" : "норма";
      }else{
        cool("Температура АКБ, °C", Math.random()*12 + 8);
        p["Нагреватели АКБ"] = "активны";
      }

      if(Math.random() < 0.25){
        p["Недостоверные датчики температуры, шт"] = Math.max(1, Number(p["Недостоверные датчики температуры, шт"] || 0) + 1);
        p["Валидные датчики температуры, шт"] = Math.max(6, Number(p["Валидные датчики температуры, шт"] || 8) - 1);
      }

      if(Math.random() < 0.20){
        p["Экономичный режим обогрева"] = "есть";
      }
    }else{
      p["Режим СОТР"] = Math.random() < 0.5 ? "тепловая защита" : "аварийное терморегулирование";

      if(Math.random() < 0.55){
        heat("Температура БРК, °C", Math.random()*25 + 20);
        heat("Температура АФУ, °C", Math.random()*24 + 18);
        p["Радиатор полезной нагрузки"] = Math.random() < 0.45 ? "отказ" : "снижена эффективность";
      }else{
        cool("Температура АКБ, °C", Math.random()*22 + 18);
        p["Нагреватели АКБ"] = Math.random() < 0.45 ? "отказ" : "отключены";
      }

      if(Math.random() < 0.45){
        p["Отказ датчика температуры"] = "да";
        p["Недостоверные датчики температуры, шт"] = Math.max(3, Number(p["Недостоверные датчики температуры, шт"] || 0) + 3);
        p["Валидные датчики температуры, шт"] = Math.min(4, Number(p["Валидные датчики температуры, шт"] || 8));
      }

      if(Math.random() < 0.35){
        p["Отказ управления нагревателями"] = "да";
        p["Управление нагревателями"] = "запрещено";
      }
    }
  }
  if(subId==="afu"){
    if(level==="warn"){
      p["Ошибка наведения луча, град"] = r((p["Ошибка наведения луча, град"] || 0.12) + 0.18, 0.08);
      p["КСВН"] = Math.min(2.7, r((Number(p["КСВН"]) || 1.35) + 0.45, 0.25));
      p["Отклонение мощности, %"] = r((Number(p["Отклонение мощности, %"]) || 3) + 8, 4);
      p["Конфигурация лучей"] = Math.random() < 0.35 ? "перенастройка" : (p["Конфигурация лучей"] || "штатная");
      if(Math.random() < 0.15) p["Состояние фильтров S/Ku/Ka"] = "перенастройка";
      if(Math.random() < 0.20) p["Ограничение от БРК"] = "есть";
    }else{
      p["Ошибка наведения луча, град"] = r((p["Ошибка наведения луча, град"] || 0.15) + 0.75, 0.18);
      p["КСВН"] = Math.min(4.0, r((Number(p["КСВН"]) || 1.35) + 1.4, 0.4));
      p["Отклонение мощности, %"] = r((Number(p["Отклонение мощности, %"]) || 3) + 24, 8);
      p["Готовность лучеобразования"] = Math.random() < 0.35 ? "нарушена" : "готово";
      if(Math.random() < 0.30) p["Состояние передающего тракта"] = "нарушен";
      if(Math.random() < 0.25) p["Состояние приёмного тракта"] = "нарушен";
      if(Math.random() < 0.22) p["Состояние МШУ"] = "отказ";
      if(Math.random() < 0.25) p["Состояние коммутаторов"] = "отказ";
      if(Math.random() < 0.25) p["Состояние фильтров S/Ku/Ka"] = "отказ";
      if(Math.random() < 0.35) p["Тракт измерения мощности"] = "нарушен";
      if(Math.random() < 0.35) p["Телеметрия АФУ"] = "нет";
    }
  }

  if(subId==="suba"){
    const add=(k, m)=>{ p[k]=(Number(p[k]) || 0) + m; };

    if(level==="warn"){
      add("Ошибки контроля целостности CAN, шт", Math.round(Math.random()*8+3));
      add("Превышения времени ожидания CAN, шт", Math.round(Math.random()*5+1));
      add("Повторы CAN, шт", Math.round(Math.random()*8+2));

      if(Math.random() < 0.20){
        add("Ошибки контроля целостности RS-485, шт", Math.round(Math.random()*4+2));
        add("Повторы RS-485, шт", Math.round(Math.random()*4+1));
      }

      if(Math.random() < 0.15){
        p["Квитанции команд СУБА"] = "нет";
      }

      if(Math.random() < 0.10){
        p["Разрешение управления БРК"] = "запрещено";
      }

    }else{
      add("Ошибки контроля целостности CAN, шт", Math.round(Math.random()*18+10));
      add("Превышения времени ожидания CAN, шт", Math.round(Math.random()*12+5));
      add("Повторы CAN, шт", Math.round(Math.random()*18+8));

      if(Math.random() < 0.40) p["Отключение CAN"] = "да";
      if(Math.random() < 0.30) p["Состояние CAN"] = "разомкнут";

      if(Math.random() < 0.35){
        p["Состояние SpaceWire"] = "разомкнут";
        add("Ошибки линии SpaceWire, шт", Math.round(Math.random()*8+5));
      }

      if(Math.random() < 0.25){
        p["Защита фидера БРК"] = "сработала";
        p["Фидер БРК"] = "отключён";
      }

      if(Math.random() < 0.20){
        p["Защита фидера АФУ"] = "сработала";
        p["Фидер АФУ"] = "отключён";
      }

      if(Math.random() < 0.20){
        p["Аварийное отключение нагрузки"] = "да";
      }

      p["Телеметрия БРК/АФУ"] = "нет";
    }
  }
  if(subId==="prop"){
    if(level==="warn"){
      p["Режим ДУ"] = "подготовка";
      p["Состояние автомата ДУ"] = "подготовка";
      p["Флаг импульса коррекции"] = "есть";
      p["Тип коррекции"] = "эксплуатационная";
      p["Таймер до включения ДУ, с"] = Math.round(Math.random()*600 + 120);
      p["Плановое ΔV, мм/с"] = Math.round(Math.random()*80 + 20);
      p["Фактическое ΔV, мм/с"] = Math.max(0, p["Плановое ΔV, мм/с"] - Math.round(Math.random()*25));
      p["Расхождение ΔV, мм/с"] = Math.abs(Number(p["Плановое ΔV, мм/с"] || 0) - Number(p["Фактическое ΔV, мм/с"] || 0));
      p["Давление магистрали рабочего тела, бар"] = Math.max(7.5, Number(p["Давление магистрали рабочего тела, бар"] || 18) - (Math.random()*5 + 3));
      p["Температура ДУ, °C"] = Math.min(68, Number(p["Температура ДУ, °C"] || 30) + Math.round(Math.random()*22 + 12));
    }else{
      p["Режим ДУ"] = "импульс коррекции";
      p["Состояние автомата ДУ"] = "выдача импульса";
      p["Флаг импульса коррекции"] = "есть";
      p["Манёвр ДУ"] = "идёт";
      p["Тип коррекции"] = Math.random() < 0.55 ? "эксплуатационная" : "деорбитация";
      p["Клапан подачи рабочего тела"] = "открыт";
      p["Тяга, мН"] = Math.random() < 0.45 ? 0 : Math.round(Math.random()*12 + 8);
      p["Длительность импульса, с"] = Math.round(Math.random()*900 + 600);
      p["Плановое ΔV, мм/с"] = Math.round(Math.random()*120 + 60);
      p["Фактическое ΔV, мм/с"] = Math.max(0, p["Плановое ΔV, мм/с"] - Math.round(Math.random()*90 + 40));
      p["Расхождение ΔV, мм/с"] = Math.abs(Number(p["Плановое ΔV, мм/с"] || 0) - Number(p["Фактическое ΔV, мм/с"] || 0));
      p["Давление магистрали рабочего тела, бар"] = Math.max(3.5, Number(p["Давление магистрали рабочего тела, бар"] || 18) - (Math.random()*10 + 8));
      p["Температура ДУ, °C"] = Math.min(90, Number(p["Температура ДУ, °C"] || 35) + Math.round(Math.random()*35 + 25));
      if(Math.random() < 0.30) p["Отказ клапана подачи"] = "да";
      if(Math.random() < 0.25) p["Запрещённая конфигурация ДУ"] = "да";
      if(Math.random() < 0.25) p["Запрет ДУ"] = "да";
      if(Math.random() < 0.35) p["Состояние источника питания ДУ"] = "не готов";
    }
  }
  if(subId==="brk"){
    if(level==="warn"){
      p["Запас радиолинии, дБ"] =
        Math.max(5.0, Number(p["Запас радиолинии, дБ"] || 9.0) - (Math.random()*1.2 + 0.8));

      p["Вероятность битовой ошибки"] = 1e-5;
      p["Потери пакетов, %"] = Math.min(2.5, Number(p["Потери пакетов, %"] || 0.1) + Math.random()*1.2);
      p["Ошибки пользовательского обмена, шт"] =
        (Number(p["Ошибки пользовательского обмена, шт"]) || 0) + Math.round(Math.random()*8 + 4);

      p["Загрузка БРК, %"] = Math.min(92, Math.max(Number(p["Загрузка БРК, %"] || 0), Math.round(84 + Math.random()*8)));

      if(Math.random() < 0.25){
        p["Ограничение от СУБА"] = "есть";
      }

    }else{
      if(Math.random() < 0.45) p["Состояние модема"] = "синхронизация потеряна";
      if(Math.random() < 0.30) p["Состояние передачи"] = "нарушена";

      p["Запас радиолинии, дБ"] =
        Math.max(2.5, Number(p["Запас радиолинии, дБ"] || 9.0) - (Math.random()*3.0 + 2.0));

      p["Вероятность битовой ошибки"] = 1e-4;
      p["Потери пакетов, %"] = Math.min(8, Number(p["Потери пакетов, %"] || 0.1) + Math.random()*4 + 2);
      p["Ошибки пользовательского обмена, шт"] =
        (Number(p["Ошибки пользовательского обмена, шт"]) || 0) + Math.round(Math.random()*25 + 15);

      p["Загрузка БРК, %"] = Math.round(96 + Math.random()*4);

      if(Math.random() < 0.25){
        p["Авария усилителя мощности"] = "да";
      }

      if(Math.random() < 0.35){
        p["Телеметрия ПН"] = "нет";
      }
    }

    const beams = Number(p["Активные лучи, шт"]);
    const rate = Number(p["Скорость на луч, Мбит/с"]);
    if(Number.isFinite(beams) && Number.isFinite(rate)){
      p["Суммарная скорость, Мбит/с"] = Math.round(beams * rate);
    }
  }
}

function applyIssue(sats, events, satNo, subId, level, text){
  const s = sats.get(satNo); if(!s || s.inactive) return;
  const st = (level === "warn") ? "warn" : "alarm";
  s.subsystems[subId].st = st;
  s.subsystems[subId].msg = text;
  tweakParamsForEvent(s, subId, level);
  evalSubsystemStatus(subId, s);
  pushJournalEvent(events, s, subId, st, text);
  markJournalLogged(s, subId);
}

function recoverSubsystem(sats, events, satNo, subId){
  const s = sats.get(satNo); if(!s || s.inactive) return;
  s.subsystems[subId].st = "ok";
  s.subsystems[subId].msg = "Норма";
  s.subsystems[subId].params = makeNominalParams(subId);
  evalSubsystemStatus(subId, s);
  pushJournalEvent(events, s, subId, "ok", "Восстановление подсистемы");
  markJournalLogged(s, subId);
}

export function tickSimulation(sats, events){
  journalTickTag += 1;
  assignNodeRoles(sats);

  for(let satNo=1; satNo<=TOTAL_SATS; satNo++){
    const s = sats.get(satNo);

    const prevStates = {};
    for(const sub of SUBSYSTEMS){
      prevStates[sub.id] = s?.subsystems?.[sub.id]?.st || "ok";
    }

    if(s.link==="ok" && Math.random()<SIM.PROB_TMI_LOSS){
      s.link="lost";
      events.unshift({ts: nowStamp(), sat: satNo, plane: s.plane, sub: "ССКУ", level:"alarm", text:"Потеря ТМИ/связи (нет данных)"});
    }else if(s.link==="lost" && Math.random()<SIM.PROB_RECOVER){
      s.link="ok";
      s.lastUpdate=nowStamp(); s.lastUpdateMs=Date.now();
      events.unshift({ts: nowStamp(), sat: satNo, plane: s.plane, sub: "ССКУ", level:"ok", text:"Восстановление ТМИ/связи"});
    }

    if(s.link==="ok"){
      s.lastUpdate=nowStamp(); s.lastUpdateMs=Date.now();
      // пересчитать статусы для подсистем с алгоритмами (eps + ttc + suba + gnc + adcs + prop + therm + cndh + brk + afu)
      evalSubsystemStatus("eps", s);
      // Накопление истории СЭС для отображения трендов (Level-4)
      try{
        const eps = s.subsystems?.eps;
        const h = eps?.hist;
        const p = eps?.params;
        if(h && p){
          const t = Date.now();
          h.t.push(t);
          h.sz.push(Number(p["СЗ АКБ, %"]));
          h.uakb.push(Number(p["UАКБ, В"]));
          const MAX=180;
          if(h.t.length>MAX){
            h.t.splice(0, h.t.length-MAX);
            h.sz.splice(0, h.sz.length-MAX);
            h.uakb.splice(0, h.uakb.length-MAX);
          }
        }
      }catch(e){}
            evalSubsystemStatus("ttc", s);
      evalSubsystemStatus("mss", s);
      evalSubsystemStatus("suba", s);
      evalSubsystemStatus("gnc", s);
      evalSubsystemStatus("adcs", s);
      evalSubsystemStatus("prop", s);
      evalSubsystemStatus("therm", s);
      evalSubsystemStatus("cndh", s);
      evalSubsystemStatus("brk", s);
      evalSubsystemStatus("afu", s);
      evalSubsystemStatus("tmi", s);

      // Связь СУДН↔ДУ: если ДУ выполняет манёвр, то СУДН фиксирует состояние «Манёвр коррекции = идёт» (эксплуатационная связность)
      try{
        const mp = s.subsystems?.prop?.params;
        const gp = s.subsystems?.gnc?.params;
        if(mp && gp){
          const firing = String(mp["Манёвр ДУ"] || "нет").trim().toLowerCase();
          if(firing === "да" || firing === "идёт" || firing === "выполняется") gp["Манёвр коррекции"] = "идёт";
        }
      }catch(e){}
    }

    const badCount = SUBSYSTEMS.filter(x=>{
      const st = s.subsystems[x.id].st;
      return st === "warn" || st === "alarm";
    }).length;

    const cooldownOk = !s._lastIssueMs || (Date.now() - s._lastIssueMs) >= SIM.ISSUE_COOLDOWN_MS;

    if(!s.inactive && s.link==="ok" && badCount < SIM.MAX_BAD_SUBSYSTEMS_PER_SAT && cooldownOk && Math.random()<SIM.PROB_ISSUE){
      const pick = randomChoice(SUBSYSTEMS.map(x=>x.id));
      const level = (Math.random()<0.97) ? "warn" : "alarm";
      applyIssue(sats, events, satNo, pick, level, randomIssueText(pick, level));
      s._lastIssueMs = Date.now();
    }

    if(!s.inactive && s.link==="ok" && Math.random()<SIM.PROB_RECOVER_SUB){
      const bad = SUBSYSTEMS.filter(x=>{
        const st = s.subsystems[x.id].st;
        return st === "warn" || st === "alarm";
      }).map(x=>x.id);

      if(bad.length) recoverSubsystem(sats, events, satNo, randomChoice(bad));
    }

    syncSubsystemJournal(s, events, prevStates);
  }
  if(events.length>250) events.length=250;
}

export function injectEvent(sats, events){
  const satNo=Math.floor(Math.random()*TOTAL_SATS)+1;
  const s=sats.get(satNo); if(!s||s.inactive) return;
  const subId=randomChoice(SUBSYSTEMS.map(x=>x.id));
  const level=(Math.random()<0.65)?"warn":"alarm";
  applyIssue(sats, events, satNo, subId, level, "Ручной инцидент: " + randomIssueText(subId, level));
}

// Применить инцидент к заданному КА и подсистеме (для локальных кнопок на 4 уровне)
export function applyIncident(sats, events, satNo, subId, level, textPrefix="Локальный инцидент"){
  const text = `${textPrefix}: ` + randomIssueText(subId, level);
  applyIssue(sats, events, satNo, subId, level, text);
}
