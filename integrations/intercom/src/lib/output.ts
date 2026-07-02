export let stringOrUndefined = (value: unknown) =>
  value === null || value === undefined ? undefined : String(value);

export let numberOrUndefined = (value: unknown) =>
  typeof value === 'number' ? value : undefined;

export let booleanOrUndefined = (value: unknown) =>
  typeof value === 'boolean' ? value : undefined;

export let timestampOrUndefined = (value: unknown) =>
  value === null || value === undefined ? undefined : String(value);

export let objectOrUndefined = (value: unknown) =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value : undefined;

export let arrayOrUndefined = (value: unknown) => (Array.isArray(value) ? value : undefined);
