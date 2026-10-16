import { buildApiServiceError, createApiServiceError } from 'slates';
import type { z } from 'zod';

export let mapYelpOutput = <T>(
  schema: z.ZodType<T>,
  map: () => { output: unknown; message: string }
): { output: T; message: string } => {
  try {
    let result = map();
    let parsed = schema.safeParse(result.output);
    if (!parsed.success) {
      throw createApiServiceError('Yelp returned an invalid response.', {
        reason: 'yelp_invalid_response'
      });
    }
    return { ...result, output: parsed.data };
  } catch (error) {
    throw buildApiServiceError(error, {
      providerLabel: 'Yelp',
      reason: 'yelp_invalid_response',
      operation: 'response mapping'
    });
  }
};
