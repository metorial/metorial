import { createApiServiceError } from 'slates';
import type { z } from 'zod';

export let parseTicketmasterOutput = <T>(
  schema: z.ZodType<T>,
  value: unknown,
  operation: string
): T => {
  let result = schema.safeParse(value);
  if (!result.success) {
    let fields = result.error.issues
      .map(issue => issue.path.join('.') || 'response')
      .join(', ');
    throw createApiServiceError(
      `Ticketmaster returned incomplete or malformed ${operation} data. Required response fields are missing or invalid: ${fields}.`,
      {
        reason: 'invalid_ticketmaster_response'
      }
    );
  }
  return result.data;
};
