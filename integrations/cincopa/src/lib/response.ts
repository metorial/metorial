import { createApiServiceError, isApiErrorRecord } from 'slates';

export let requireSuccess = (data: unknown): boolean => {
  if (!isApiErrorRecord(data) || typeof data.success !== 'boolean') {
    throw createApiServiceError('Cincopa did not return a success flag.');
  }
  return data.success;
};

export let requireRecords = (value: unknown, label: string): Record<string, unknown>[] => {
  if (!Array.isArray(value) || !value.every(isApiErrorRecord)) {
    throw createApiServiceError(`Cincopa did not return a valid ${label} list.`);
  }
  return value;
};

export let requireString = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || !value) {
    throw createApiServiceError(`Cincopa did not return ${label}.`);
  }
  return value;
};

export let getTotalCount = (...values: unknown[]): number | undefined =>
  values.find((value): value is number => typeof value === 'number' && Number.isFinite(value));
