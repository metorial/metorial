export let optionalString = (value: unknown) =>
  typeof value === 'string' ? value : undefined;

export let optionalNumber = (value: unknown) =>
  typeof value === 'number' ? value : undefined;

export let optionalBoolean = (value: unknown) =>
  typeof value === 'boolean' ? value : undefined;
