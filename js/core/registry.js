import { renderDetailGeneric } from "../subsystems/generic/generic.render.js";
import { renderDetailEPS, renderDetailEPS_Control, renderDetailEPS_Current, renderDetailEPS_U, renderDetailEPS_SoC } from "../subsystems/eps/eps.render.js";
import {
  renderDetailTTC,
  renderDetailTTC_Control,
  renderDetailTTC_Current,
  renderDetailTTC_Link
} from "../subsystems/ttc/ttc.render.js";
import {
  renderDetailSUBA,
  renderDetailSUBA_Control,
  renderDetailSUBA_Current,
  renderDetailSUBA_Power,
  renderDetailSUBA_If
} from "../subsystems/suba/suba.render.js";
import {
  renderDetailGNC,
  renderDetailGNC_Control,
  renderDetailGNC_Current,
  renderDetailGNC_Maneuver
} from "../subsystems/gnc/gnc.render.js";
import {
  renderDetailADCS,
  renderDetailADCS_Control,
  renderDetailADCS_Current,
  renderDetailADCS_Momentum
} from "../subsystems/adcs/adcs.render.js";
import {
  renderDetailPROP,
  renderDetailPROP_Control,
  renderDetailPROP_Current,
  renderDetailPROP_Maneuver
} from "../subsystems/prop/prop.render.js";
import {
  renderDetailTHERM,
  renderDetailTHERM_Control,
  renderDetailTHERM_Current,
  renderDetailTHERM_Zones
} from "../subsystems/therm/therm.render.js";
import {
  renderDetailCNDH,
  renderDetailCNDH_Control,
  renderDetailCNDH_Current,
  renderDetailCNDH_Config
} from "../subsystems/cndh/cndh.render.js";
import {
  renderDetailBRK,
  renderDetailBRK_Control,
  renderDetailBRK_Current,
  renderDetailBRK_Link
} from "../subsystems/brk/brk.render.js";
import {
  renderDetailAFU,
  renderDetailAFU_Control,
  renderDetailAFU_Current,
  renderDetailAFU_Beams
} from "../subsystems/afu/afu.render.js";
import {
  renderDetailTMI,
  renderDetailTMI_Control,
  renderDetailTMI_Current,
  renderDetailTMI_Quality
} from "../subsystems/tmi/tmi.render.js";
import {
  renderDetailMSS,
  renderDetailMSS_Control,
  renderDetailMSS_Current,
  renderDetailMSS_Links
} from "../subsystems/mss/mss.render.js";
import { evalEpsStatus } from "../subsystems/eps/eps.eval.js";
import { evalTtcStatus } from "../subsystems/ttc/ttc.eval.js";
import { evalSubaStatus } from "../subsystems/suba/suba.eval.js";
import { evalGncStatus } from "../subsystems/gnc/gnc.eval.js";
import { evalAdcsStatus } from "../subsystems/adcs/adcs.eval.js";
import { evalPropStatus } from "../subsystems/prop/prop.eval.js";
import { evalThermStatus } from "../subsystems/therm/therm.eval.js";
import { evalCndhStatus } from "../subsystems/cndh/cndh.eval.js";
import { evalBrkStatus } from "../subsystems/brk/brk.eval.js";
import { evalAfuStatus } from "../subsystems/afu/afu.eval.js";
import { evalTmiStatus } from "../subsystems/tmi/tmi.eval.js";
import { evalMssStatus } from "../subsystems/mss/mss.eval.js";

export const SUBSYSTEMS = [
  { id:"eps",   name:"СЭС" },
  { id:"therm", name:"СОТР" },
  { id:"cndh",  name:"БКУ/БВС" },
  { id:"tmi",   name:"ТМИ/СБИ" },
  { id:"suba",  name:"СУБА" },
  { id:"ttc",   name:"ССКУ" },
  { id:"mss",   name:"МСС" },
  { id:"gnc",   name:"СУДН (навигация)" },
  { id:"adcs",  name:"СУДН (ориентация)" },
  { id:"prop",  name:"ДУ" },
  { id:"brk",   name:"БРК Ku/Ka" },
  { id:"afu",   name:"АФУ ПН" },
];


export const DETAIL_RENDERERS = {
  eps: renderDetailEPS,
  eps_control: renderDetailEPS_Control,
  eps_current: renderDetailEPS_Current,
  eps_u: renderDetailEPS_U,
  eps_soc: renderDetailEPS_SoC,
      ttc: renderDetailTTC,
  ttc_control: renderDetailTTC_Control,
  ttc_current: renderDetailTTC_Current,
  ttc_link: renderDetailTTC_Link,
    mss: renderDetailMSS,
  mss_control: renderDetailMSS_Control,
  mss_current: renderDetailMSS_Current,
  mss_links: renderDetailMSS_Links,
    suba: renderDetailSUBA,
  suba_control: renderDetailSUBA_Control,
  suba_current: renderDetailSUBA_Current,
  suba_power: renderDetailSUBA_Power,
  suba_if: renderDetailSUBA_If,
    gnc: renderDetailGNC,
  gnc_control: renderDetailGNC_Control,
  gnc_current: renderDetailGNC_Current,
  gnc_maneuver: renderDetailGNC_Maneuver,
    adcs: renderDetailADCS,
  adcs_control: renderDetailADCS_Control,
  adcs_current: renderDetailADCS_Current,
  adcs_momentum: renderDetailADCS_Momentum,
    prop: renderDetailPROP,
  prop_control: renderDetailPROP_Control,
  prop_current: renderDetailPROP_Current,
  prop_maneuver: renderDetailPROP_Maneuver,
    therm: renderDetailTHERM,
  therm_control: renderDetailTHERM_Control,
  therm_current: renderDetailTHERM_Current,
  therm_zones: renderDetailTHERM_Zones,
    cndh: renderDetailCNDH,
  cndh_control: renderDetailCNDH_Control,
  cndh_current: renderDetailCNDH_Current,
  cndh_config: renderDetailCNDH_Config,
    brk: renderDetailBRK,
  brk_control: renderDetailBRK_Control,
  brk_current: renderDetailBRK_Current,
  brk_link: renderDetailBRK_Link,
    afu: renderDetailAFU,
  afu_control: renderDetailAFU_Control,
  afu_current: renderDetailAFU_Current,
  afu_beams: renderDetailAFU_Beams,
    tmi: renderDetailTMI,
  tmi_control: renderDetailTMI_Control,
  tmi_current: renderDetailTMI_Current,
  tmi_quality: renderDetailTMI_Quality,
};

export const STATUS_EVALS = {
  eps: evalEpsStatus,
    ttc: evalTtcStatus,
  mss: evalMssStatus,
  suba: evalSubaStatus,
  gnc: evalGncStatus,
  adcs: evalAdcsStatus,
  prop: evalPropStatus,
  therm: evalThermStatus,
  cndh: evalCndhStatus,
  brk: evalBrkStatus,
  afu: evalAfuStatus,
  tmi: evalTmiStatus,
};

export function getSubMeta(subId){
  return SUBSYSTEMS.find(s=>s.id===subId) || { id: subId, name: subId };
}

export function getDetailRenderer(subId){
  return DETAIL_RENDERERS[subId] || renderDetailGeneric;
}

export function evalSubsystemStatus(subId, sat){
  const fn = STATUS_EVALS[subId];
  if(fn) fn(sat);
}
