export let parseAddressNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value !== 'number' && typeof value !== 'string') return undefined;
  let number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};
