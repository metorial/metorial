export let parseNumericValue = (value: unknown): number | undefined => {
  if (typeof value !== 'number' && typeof value !== 'string') return undefined;
  if (typeof value === 'string' && !value.trim()) return undefined;
  let number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};
