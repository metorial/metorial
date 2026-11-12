import type { z } from 'zod';
import { createApiServiceError } from './api';

/**
 * Parses a value the integration saved or received, throwing a user-facing
 * `ServiceError` with `message` (and the optional `reason`) when it does not match.
 */
export let parseWithServiceError = <T extends z.ZodType>(
  schema: T,
  value: unknown,
  message: string,
  options: { reason?: string } = {}
): z.output<T> => {
  let result = schema.safeParse(value);
  if (!result.success) throw createApiServiceError(message, options);
  return result.data;
};
