export let formatTimestamp = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  let date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};
