import { createApiServiceError, isApiErrorRecord } from 'slates';

export let requireRecord = (value: unknown, operation: string) => {
  if (!isApiErrorRecord(value)) {
    throw createApiServiceError(`Stoat returned an invalid ${operation} response.`);
  }
  return value;
};

export let requireArray = (value: unknown, operation: string): any[] => {
  if (!Array.isArray(value)) {
    throw createApiServiceError(`Stoat returned an invalid ${operation} list.`);
  }
  return value;
};

export let requireString = (value: unknown, field: string): string => {
  if (typeof value !== 'string') {
    throw createApiServiceError(`Stoat did not return ${field}.`);
  }
  return value;
};
