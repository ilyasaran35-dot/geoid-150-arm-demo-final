export const TOTAL_PLANES = 14;
export const SATS_PER_PLANE = 22;
export const TOTAL_SATS = TOTAL_PLANES * SATS_PER_PLANE;

export function planeLabel(n){ return `${n}-я пл-ть`; }
export function satLabel(n){ return `${n} КА`; }
export function satPlane(satNo){ return Math.ceil(satNo / SATS_PER_PLANE); }
export function satRangeForPlane(plane){
  const start=(plane-1)*SATS_PER_PLANE+1;
  return { start, end: start+SATS_PER_PLANE-1 };
}
export function satIndexInPlane(satNo){
  return ((satNo - 1) % SATS_PER_PLANE) + 1;
}

export function satNeighborForward(satNo){
  const plane = satPlane(satNo);
  const { start, end } = satRangeForPlane(plane);
  return satNo === end ? start : satNo + 1;
}

export function satNeighborBackward(satNo){
  const plane = satPlane(satNo);
  const { start, end } = satRangeForPlane(plane);
  return satNo === start ? end : satNo - 1;
}