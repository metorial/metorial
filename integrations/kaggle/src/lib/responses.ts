import { createApiServiceError, isApiErrorRecord } from 'slates';

export let kaggleRecord = (value: unknown, label: string): Record<string, any> => {
  if (!isApiErrorRecord(value)) {
    throw createApiServiceError(`Kaggle returned an invalid ${label} response.`);
  }
  return value;
};

export let kaggleList = (value: unknown, keys: string[], label: string): unknown[] => {
  if (Array.isArray(value)) return value;
  if (isApiErrorRecord(value)) {
    for (let key of keys) {
      if (Array.isArray(value[key])) return value[key];
    }
  }
  throw createApiServiceError(`Kaggle returned an invalid ${label} list.`);
};

// Typed summaries omit absent provider values; raw keeps the original response.
let withoutNulls = (value: unknown): any => {
  if (Array.isArray(value)) return value.map(withoutNulls);
  if (isApiErrorRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== null && item !== undefined)
        .map(([key, item]) => [key, withoutNulls(item)])
    );
  }
  return value;
};

export let kaggleSummary = (
  value: unknown,
  label: string,
  requiredStrings: string[] = []
): Record<string, any> => {
  let record = kaggleRecord(value, label);
  for (let key of requiredStrings) {
    if (typeof record[key] !== 'string' || !record[key].trim()) {
      throw createApiServiceError(`Kaggle returned ${label} without a valid ${key}.`);
    }
  }
  return { ...withoutNulls(record), raw: record };
};

export let requireKaggleText = (value: string | undefined, label: string): string => {
  if (!value?.trim()) throw createApiServiceError(`${label} is required.`);
  return value;
};

export let requireKagglePositiveNumber = (
  value: number | undefined,
  label: string
): number => {
  if (value === undefined || !Number.isSafeInteger(value) || value < 1) {
    throw createApiServiceError(`${label} must be a positive whole number.`);
  }
  return value;
};
