import { createApiServiceError } from 'slates';
import type { z } from 'zod';

export let validateInteger = (value: number, field: string, min = 1, max?: number) => {
  if (!Number.isSafeInteger(value) || value < min || (max !== undefined && value > max)) {
    throw createApiServiceError(
      `Provide ${field} as an integer ${max === undefined ? `of at least ${min}` : `between ${min} and ${max}`}.`
    );
  }
};

export let parseResponse = <T>(schema: z.ZodType<T>, data: unknown, operation: string): T => {
  let parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw createApiServiceError(`Hacker News returned an invalid ${operation} response.`, {
      reason: 'hackernews_invalid_response'
    });
  }
  return parsed.data;
};

export let toIsoTimestamp = (timestamp: number | undefined): string | undefined => {
  if (timestamp === undefined) return undefined;
  let date = new Date(timestamp * 1000);
  if (!Number.isFinite(date.getTime())) {
    throw createApiServiceError('Hacker News returned an invalid creation timestamp.');
  }
  return date.toISOString();
};
