export const SEVERITY = { ok:0, warn:1, alarm:2 };

export function pad2(n){ return String(n).padStart(2,'0'); }
export function nowStamp(){
  const d=new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}
export function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}
export function worst(a,b){ return SEVERITY[a] >= SEVERITY[b] ? a : b; }
export function clamp(n,min,max){ return Math.max(min, Math.min(max, n)); }

export function setCellStatusClass(el, st){
  el.classList.remove("st-ok","st-warn","st-alarm","st-inactive","st-muted");
  if(st==="ok") el.classList.add("st-ok");
  else if(st==="warn") el.classList.add("st-warn");
  else if(st==="alarm") el.classList.add("st-alarm");
  else if(st==="inactive") el.classList.add("st-inactive");
  else el.classList.add("st-muted");
}
