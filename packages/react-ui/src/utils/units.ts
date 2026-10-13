export function metersToKilometers(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Number((value / 1000).toFixed(1));
}

export function secondsToMinutes(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Number((value / 60).toFixed(1));
}
