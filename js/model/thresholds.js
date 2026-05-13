// Пороги и уставки заданы как инженерные допущения первого приближения для имитационной модели АРМ НКУ.
export const TH = {
  eps: {
    // СЭС ГЕОИД-150: значения приведены к ВКР, раздел 6.4.5.
    // Напряжение шины питания Uш, В
    U_BUS_OK_MIN_V: 27.0,
    U_BUS_OK_MAX_V: 29.0,
    U_BUS_WARN_MIN_V: 25.0,
    U_BUS_WARN_MAX_V: 30.0,

    // Степень заряда аккумуляторной батареи, %
    SZ_AKB_OK_MIN_PCT: 60,
    SZ_AKB_WARN_MIN_PCT: 30,
    SZ_AKB_CRIT_MIN_PCT: 20,

    // Температура аккумуляторной батареи, °C
    T_AKB_OK_MIN_C: 0,
    T_AKB_OK_MAX_C: 30,
    T_AKB_WARN_MIN_C: -10,
    T_AKB_WARN_MAX_C: 40,

    // Баланс мощности Pбал = Pген - Pнаг, Вт
    P_BAL_NEAR_ZERO_W: 20,

    // Состав СЭС по ВКР: одна аккумуляторная батарея Li-ion порядка 20 А·ч.
    BAT_ARCH: "1 аккумуляторная батарея Li-ion",
    BAT_CAPACITY_AH_TOTAL: 20,
    SOLAR_ARRAY_COUNT: 2,
    SOLAR_ARRAY_AREA_M2_EACH: 1.2,
    INSTALLED_POWER_W: 450,

    // Ограничение полезной нагрузки при деградации СЭС
    PAYLOAD_LIMIT_POLICY: "ограничение БРК/АФУ при снижении СЗ АКБ и отрицательном энергобалансе вне тени",
  }

  ,suba: {
    // СУБА ГЕОИД-150: управление БРК/АФУ, фидерами целевой аппаратуры
    // и внутренними интерфейсами CAN / RS-485 / SpaceWire.
    // Пороги являются инженерными допущениями первого приближения.

    WINDOW_S: 10,

    CAN_INTEGRITY_WARN_MAX: 10,
    CAN_INTEGRITY_ALARM_MAX: 25,
    CAN_WAIT_WARN_MAX: 6,
    CAN_WAIT_ALARM_MAX: 15,
    CAN_RETRY_WARN_MAX: 8,
    CAN_RETRY_ALARM_MAX: 20,
    CAN_BUS_OFF_ALARM: true,

    RS485_INTEGRITY_WARN_MAX: 6,
    RS485_INTEGRITY_ALARM_MAX: 15,
    RS485_WAIT_WARN_MAX: 4,
    RS485_WAIT_ALARM_MAX: 10,
    RS485_RETRY_WARN_MAX: 6,
    RS485_RETRY_ALARM_MAX: 15,

    SPW_LINE_WARN_MAX: 3,
    SPW_LINE_ALARM_MAX: 8,
    SPW_WAIT_WARN_MAX: 3,
    SPW_WAIT_ALARM_MAX: 8,
    SPW_RETRY_WARN_MAX: 5,
    SPW_RETRY_ALARM_MAX: 12,

    FEEDER_TRIP_ALARM: true,
    UV_HINT: "ограничение БРК/АФУ, отключение фидера, повтор команды СУБА, сброс интерфейса, переход на резервный маршрут обмена",
  }

  ,gnc: {
    // СУДН (навигация) ГЕОИД-150: навигационное решение,
    // готовность коррекции орбиты и контроль выполнения манёвра.
    // Численные пороги являются инженерными допущениями первого приближения.

    POS_SIGMA_OK_MAX_M: 50,
    POS_SIGMA_WARN_MAX_M: 120,
    POS_SIGMA_ALARM_MAX_M: 250,

    VEL_SIGMA_OK_MAX_MS: 0.05,
    VEL_SIGMA_WARN_MAX_MS: 0.15,
    VEL_SIGMA_ALARM_MAX_MS: 0.30,

    VALID_NAV_MEAS_OK_MIN: 4,
    VALID_NAV_MEAS_WARN_MIN: 3,

    NAV_AGE_WARN_MS: 8000,
    NAV_AGE_ALARM_MS: 15000,

    MANEUVER_ACTIVE_TIMEOUT_S: 900,
    DV_WARN_MMS: 20,
    DV_ALARM_MMS: 60,

    TIME_SOURCE: "бортовая шкала времени / время приёма НКУ",
    UV_HINT: "запрет коррекции при неготовности навигации, повтор расчёта манёвра, проверка ГНСС/ИНС, отмена коррекции орбиты",
  }
  ,adcs: {
    // СУДН (ориентация) ГЕОИД-150: точность ориентации,
    // готовность датчиков, исполнительные органы, кинетический момент
    // и разгрузка маховиков. Пороги являются инженерными допущениями
    // первого приближения для проверки логики отображения.

    ATT_ERR_WARN_ARCSEC: 90,
    ATT_ERR_ALARM_ARCSEC: 180,

    ATT_SIGMA_WARN_ARCSEC: 30,
    ATT_SIGMA_ALARM_ARCSEC: 90,

    RATE_WARN_DPS: 0.15,
    RATE_ALARM_DPS: 0.40,

    STAR_VALID_OK_MIN: 1,
    SUN_VALID_WARN_MIN: 1,
    GYRO_VALID_OK_MIN: 3,
    GYRO_VALID_WARN_MIN: 2,

    ORIENT_AGE_WARN_MS: 8000,
    ORIENT_AGE_ALARM_MS: 15000,

    MOMENT_WARN_PCT: 70,
    MOMENT_UNLOAD_START_PCT: 80,
    MOMENT_UNLOAD_STOP_PCT: 50,
    MOMENT_ALARM_PCT: 95,

    UNLOAD_TIMEOUT_S: 900,
    TIME_SOURCE: "бортовая шкала времени / время приёма НКУ",
    UV_HINT: "переход в безопасную ориентацию, гашение угловых скоростей, запуск разгрузки кинетического момента, запрет точных режимов при деградации датчиков",
  }

  ,prop: {
    // ДУ ГЕОИД-150: исполнительная часть коррекции орбиты на базе ЭРДУ СПД-50.
    // Контролируются готовность ДУ, магистраль рабочего тела, питание,
    // клапан подачи, импульс коррекции и расхождение ΔV.
    // Пороги являются инженерными допущениями первого приближения.

    TYPE: "ЭРДУ СПД-50",

    MAG_PRESS_WARN_MIN_BAR: 10,
    MAG_PRESS_ALARM_MIN_BAR: 6,

    SUPPLY_WARN_MIN_V: 26.0,
    SUPPLY_ALARM_MIN_V: 24.0,

    TEMP_WARN_MAX_C: 60,
    TEMP_ALARM_MAX_C: 75,

    THRUST_ACTIVE_MIN_MN: 5,

    DV_WARN_MMS: 20,
    DV_ALARM_MMS: 60,

    MANEUVER_TIMEOUT_S: 1200,
    AGE_ALARM_MS: 8000,

    TIME_SOURCE: "бортовая шкала времени / время приёма НКУ",
    UV_HINT: "запрет импульса ДУ, отмена коррекции, проверка клапана подачи рабочего тела, проверка источника питания ДУ, повтор расчёта ΔV через СУДН",
  }

  ,therm: {
    // СОТР ГЕОИД-150: контроль температурных зон КА связи,
    // состояния температурных датчиков, нагревателей, радиаторов
    // и тепловых ограничений смежных систем.
    // Пороги являются инженерными допущениями первого приближения.

    AGE_WARN_MS: 5000,
    AGE_ALARM_MS: 8000,
    WINDOW_S: 60,

    BKU_WARN_MIN_C: 0,
    BKU_WARN_MAX_C: 50,
    BKU_ALARM_MIN_C: -10,
    BKU_ALARM_MAX_C: 60,

    SES_WARN_MIN_C: 0,
    SES_WARN_MAX_C: 50,
    SES_ALARM_MIN_C: -10,
    SES_ALARM_MAX_C: 60,

    AKB_WARN_MIN_C: 5,
    AKB_WARN_MAX_C: 35,
    AKB_ALARM_MIN_C: 0,
    AKB_ALARM_MAX_C: 45,

    SUDN_WARN_MIN_C: 0,
    SUDN_WARN_MAX_C: 50,
    SUDN_ALARM_MIN_C: -10,
    SUDN_ALARM_MAX_C: 60,

    DU_WARN_MIN_C: 0,
    DU_WARN_MAX_C: 60,
    DU_ALARM_MIN_C: -10,
    DU_ALARM_MAX_C: 75,

    BRK_WARN_MIN_C: 0,
    BRK_WARN_MAX_C: 55,
    BRK_ALARM_MIN_C: -10,
    BRK_ALARM_MAX_C: 70,

    AFU_WARN_MIN_C: 0,
    AFU_WARN_MAX_C: 55,
    AFU_ALARM_MIN_C: -10,
    AFU_ALARM_MAX_C: 70,

    MSS_WARN_MIN_C: 0,
    MSS_WARN_MAX_C: 50,
    MSS_ALARM_MIN_C: -10,
    MSS_ALARM_MAX_C: 65,

    GROUP_OVERHEAT_WARN_C: 55,
    GROUP_OVERHEAT_ALARM_C: 70,
    GROUP_OVERCOOL_WARN_C: 0,
    GROUP_OVERCOOL_ALARM_C: -10,

    VALID_SENSORS_WARN_MIN: 7,
    VALID_SENSORS_ALARM_MIN: 5,
    BAD_SENSORS_WARN_MAX: 1,
    BAD_SENSORS_ALARM_MAX: 3,

    TIME_SOURCE: "бортовая шкала времени / время приёма НКУ",
    UV_HINT: "перевод СОТР в штатное терморегулирование, снятие экономичного режима обогрева, проверка датчиков температуры, проверка фидеров нагревателей, ограничение тепловыделяющих режимов БРК/АФУ и ДУ",
  }

  ,cndh: {
    // БКУ/БВС — состояние вычислителей, ПЗУ/ОЗУ, сторожевой контроль, резервирование
    CPU_WARN_PCT: 75,
    CPU_ALARM_PCT: 90,
    MEM_WARN_PCT: 80,
    MEM_ALARM_PCT: 92,
    WDT_ALARM: true,
    SW_CRC_ALARM: true,
    TIME_SOURCE: "БШВ (бортовое время)",
    UV_HINT: "проверка БКУ/БВС, перезапуск программного обеспечения, переключение на резервный комплект, перевод КА в безопасный режим",
  }

  ,brk: {
    // БРК Ku/Ka ГЕОИД-150: бортовой ретрансляционный комплекс связи.
    // Параметр "до 200 Мбит/с на луч" принят из ВКР.
    // Остальные пороги являются инженерными допущениями первого приближения
    // для проверки логики отображения.

    RATE_PER_BEAM_TARGET_MBPS: 200,

    LINK_MARGIN_OK_MIN_DB: 7.0,
    LINK_MARGIN_WARN_MIN_DB: 5.0,
    LINK_MARGIN_ALARM_MIN_DB: 3.5,

    BIT_ERROR_WARN: 1e-5,
    BIT_ERROR_ALARM: 1e-4,

    PACKET_LOSS_WARN_PCT: 1.0,
    PACKET_LOSS_ALARM_PCT: 3.0,

    USER_EXCHANGE_ERR_WARN_MAX: 10,
    USER_EXCHANGE_ERR_ALARM_MAX: 25,

    LOAD_WARN_MAX_PCT: 85,
    LOAD_ALARM_MAX_PCT: 95,

    TEMP_WARN_MAX_C: 55,
    TEMP_ALARM_MAX_C: 70,

    WINDOW_S: 60,
    TIME_SOURCE: "бортовая шкала времени / время приёма НКУ",
    UV_HINT: "ограничение пользовательского трафика, снижение числа активных лучей, перевод БРК в дежурный режим, повтор конфигурации через СУБА",
  }

  ,afu: {
    // АФУ ПН ГЕОИД-150: антенно-фидерное устройство полезной нагрузки связи.
    // Контролируются лучеобразование, тракты S/Ku/Ka, МШУ, коммутаторы,
    // фильтры, КСВН, тракт измерения мощности и тепловое состояние.
    // Пороги являются инженерными допущениями первого приближения.

    BEAM_POINT_WARN_DEG: 0.30,
    BEAM_POINT_ALARM_DEG: 0.80,

    VSWR_WARN: 2.0,
    VSWR_ALARM: 3.0,

    POWER_DEV_WARN_PCT: 10,
    POWER_DEV_ALARM_PCT: 25,

    TEMP_WARN_MAX_C: 55,
    TEMP_ALARM_MAX_C: 70,

    AGE_ALARM_MS: 8000,
    WINDOW_S: 60,
    TIME_SOURCE: "бортовая шкала времени / время приёма НКУ",
    UV_HINT: "переконфигурация лучей, переключение тракта, ограничение передачи, проверка МШУ, коммутаторов, фильтров и тракта измерения мощности",
  }

  ,tmi: {
    // ТМИ/СБИ — качество телеметрической информации,
    // поступающей в алгоритмы контроля НКУ.
    // Пороги являются инженерными допущениями первого приближения
    // для проверки логики отображения.

    AGE_WARN_MS: 8000,
    AGE_ALARM_MS: 15000,

    COMPLETENESS_OK_MIN_PCT: 98,
    COMPLETENESS_WARN_MIN_PCT: 92,
    COMPLETENESS_ALARM_MIN_PCT: 85,

    VALIDITY_OK_MIN_PCT: 98,
    VALIDITY_WARN_MIN_PCT: 95,
    VALIDITY_ALARM_MIN_PCT: 90,

    INTEGRITY_WARN_MAX: 3,
    INTEGRITY_ALARM_MAX: 10,

    WAIT_WARN_MAX: 2,
    WAIT_ALARM_MAX: 6,

    RETRY_WARN_MAX: 5,
    RETRY_ALARM_MAX: 15,

    LOST_FRAMES_WARN_MAX: 5,
    LOST_FRAMES_ALARM_MAX: 20,

    INVALID_PARAMS_WARN_MAX: 3,
    INVALID_PARAMS_ALARM_MAX: 10,

    WINDOW_S: 60,
    TIME_SOURCE: "бортовая шкала времени / время приёма НКУ",
    NOTE: "ТМИ считается пригодной для контроля только при достаточной полноте, достоверности и актуальности данных.",
  }

  ,ttc: {
    // ССКУ ГЕОИД-150: служебный канал ТМ/КИ в S-диапазоне.
    // Численные пороги являются инженерными допущениями первого приближения
    // для проверки логики отображения и подлежат уточнению по ТТХ радиолинии.

    SERVICE_RATE_MAX_KBIT_S: 512,

    SIGNAL_OK_MIN_DBM: -90,
    SIGNAL_WARN_MIN_DBM: -95,

    INTEGRITY_WARN_MAX: 10,
    INTEGRITY_ALARM_MAX: 25,

    WAIT_WARN_MAX: 8,
    WAIT_ALARM_MAX: 18,

    RETRY_WARN_MAX: 5,
    RETRY_ALARM_MAX: 12,

    AGE_ALARM_MS: 8000,
    TIME_SYNC_REQUIRED: true,

    WINDOW_S: 60,
    TIME_SOURCE: "бортовая шкала времени / время приёма НКУ",
    UV_HINT: "повтор приёма ТМИ, повтор выдачи КИ, проверка синхронизации времени, переход на резервный сеанс",
  }

  ,mss: {
    // МСС ГЕОИД-150: внутриплоскостная межспутниковая связь.
    // В модели рассматриваются два направления: вперёд и назад по орбитальной плоскости.
    // Пороги являются инженерными допущениями первого приближения.

    DELAY_WARN_MS: 80,
    DELAY_ALARM_MS: 180,

    RETRY_WARN_MAX: 4,
    RETRY_ALARM_MAX: 10,

    LOSS_WARN_MAX: 2,
    LOSS_ALARM_MAX: 6,

    TRANSIT_AGE_WARN_MS: 5000,
    TRANSIT_AGE_ALARM_MS: 8000,

    SERVICE_RATE_WARN_KBIT_S: 1500,
    SERVICE_RATE_ALARM_KBIT_S: 2500,

    WINDOW_S: 60,
    TIME_SOURCE: "бортовая шкала времени / транзитная временная метка",
    UV_HINT: "повтор маршрута ТМ/КИ, переназначение узлового КА, исключение неисправного направления, проверка захвата соседнего КА",
  }

};
