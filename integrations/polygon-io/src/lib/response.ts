import { createApiServiceError, isApiErrorRecord } from 'slates';
import { z } from 'zod';

export let cursorInput = z
  .string()
  .optional()
  .describe(
    'Opaque cursor returned by nextCursor. Keep the other filters unchanged when requesting the next page.'
  );
export let cursorOutput = z
  .string()
  .optional()
  .describe('Opaque cursor for the next page, when returned by the provider.');

export let nextCursor = (data: unknown) => {
  if (!isApiErrorRecord(data) || data.next_url == null) return undefined;
  if (typeof data.next_url !== 'string')
    throw createApiServiceError('Polygon.io returned an invalid pagination URL.');
  try {
    let url = new URL(data.next_url);
    return url.searchParams.get('cursor') ?? undefined;
  } catch {
    throw createApiServiceError('Polygon.io returned an invalid pagination URL.');
  }
};

export let responseObject = (value: unknown, label: string): Record<string, any> => {
  if (!isApiErrorRecord(value))
    throw createApiServiceError(`Polygon.io returned an invalid ${label}.`);
  return value;
};

export let responseRows = (value: unknown, label = 'results') => {
  if (value == null) return undefined;
  if (!Array.isArray(value))
    throw createApiServiceError(`Polygon.io returned an invalid ${label} array.`);
  return value.map(row => responseObject(row, `${label} record`));
};

export let requiredTicker = (value: unknown) => {
  if (typeof value !== 'string' || !value)
    throw createApiServiceError(
      'Polygon.io returned a record without its required ticker symbol.'
    );
  return value;
};

export let financialStatement = (value: unknown) => {
  if (value == null) return undefined;
  let statement = responseObject(value, 'financial statement');
  return Object.fromEntries(
    Object.entries(statement).map(([key, item]) => {
      if (item == null) return [key, undefined];
      let line = responseObject(item, 'financial line item');
      return [
        key,
        {
          label: line.label ?? undefined,
          value: line.value ?? undefined,
          unit: line.unit ?? undefined,
          order: line.order ?? undefined
        }
      ];
    })
  );
};

export let aggregateNextFrom = (data: unknown) => {
  if (!isApiErrorRecord(data) || data.next_url == null) return undefined;
  if (typeof data.next_url !== 'string')
    throw createApiServiceError('Polygon.io returned an invalid pagination URL.');
  try {
    return (
      decodeURIComponent(new URL(data.next_url).pathname.split('/').at(-2) ?? '') || undefined
    );
  } catch {
    throw createApiServiceError('Polygon.io returned an invalid pagination URL.');
  }
};
