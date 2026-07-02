import { pickDefined } from 'slates';

export let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export let getString = (value: unknown, key: string) => {
  if (!isRecord(value)) return undefined;
  return typeof value[key] === 'string' ? value[key] : undefined;
};

export let getNumber = (value: unknown, key: string) => {
  if (!isRecord(value)) return undefined;
  return typeof value[key] === 'number' ? value[key] : undefined;
};

export let objectWithDefined = (value: Record<string, unknown>) => pickDefined(value);

export let mergeAdditionalFields = (
  body: Record<string, unknown>,
  additionalFields: Record<string, unknown> | undefined
) => (additionalFields ? { ...body, ...additionalFields } : body);
