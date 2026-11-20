import type { z } from 'zod';
import { createApiServiceError } from './api';

/** Parses a saved or received value, throwing a user-facing `ServiceError` on mismatch. */
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
