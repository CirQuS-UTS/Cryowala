

import { FridgeConfig, LineConfig, SegmentConfig, StageConfig } from '@/components/pyodide/fridge.d';

export function shortNumber(num: number, digits: number = 3): string {
  const decimalPlaces = digits - 1;
  if (num === 0) {
    return "0";
  } else if (num <= Math.pow(10, -decimalPlaces) || num >= Math.pow(10, decimalPlaces)) {
    return num.toExponential();
  } else {
    return num.toFixed(decimalPlaces).slice(0, digits + 1)
  }
}

export function getSIUnits(value: number | undefined, unit: string): string {
  if (value == undefined) return 'NaN';
  const magnitude = Math.floor(Math.log10(value));
  if (magnitude < -12) return `${value * Math.pow(10, 15)}f${unit}`
  else if (magnitude < -9) return `${value * Math.pow(10, 12)}p${unit}`
  else if (magnitude < -6) return `${value * Math.pow(10, 9)}n${unit}`
  else if (magnitude < -3) return `${value * Math.pow(10, 6)}u${unit}`
  else if (magnitude < 0) return `${value * Math.pow(10, 3)}m${unit}`
  else if (magnitude < 3) return `${value}${unit}`
  else if (magnitude < 6) return `${value * Math.pow(10, -3)}k${unit}`
  else if (magnitude < 9) return `${value * Math.pow(10, -6)}M${unit}`
  else if (magnitude < 12) return `${value * Math.pow(10, -9)}G${unit}`
  else if (magnitude < 15) return `${value * Math.pow(10, -12)}T${unit}`
  else return `${value * Math.pow(10, -15)}P${unit}`
}

export function getLineColour(fridge: FridgeConfig, cableId: string): string {
  const cableIndex = fridge.cables.findIndex(cable => cable.id === cableId);
  return `hsl(${Math.floor(256 * cableIndex / fridge.cables.length)}, 100%, 50%)`;
}

export function getStageIndex(stages: StageConfig[], stageId: string): number {
  return stages.find(stage => stage.id === stageId)?.index ?? 0;
}

export function getOrderedLineSegments(fridge: FridgeConfig, lineId: string): SegmentConfig[] {
  const lineSegments = fridge.segments.filter(segment => segment.lineId === lineId);
  lineSegments.sort((a, b) => getStageIndex(fridge.stages, a.stageId) - getStageIndex(fridge.stages, b.stageId));

  return lineSegments;
}