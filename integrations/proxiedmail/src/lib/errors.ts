import { buildApiServiceError, createApiServiceError } from 'slates';
import type { z } from 'zod';

export let proxiedMailError = (error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'ProxiedMail',
    reason: 'proxiedmail_api_error',
    extractResponse: (error, helpers) => helpers.getResponseWithBody(error),
    nestedKeys: ['data', 'attributes', 'errors']
  });

export let parseProxiedMailResponse = <T>(schema: z.ZodType<T>, value: unknown): T => {
  let result = schema.safeParse(value);
  if (!result.success) {
    throw createApiServiceError('ProxiedMail returned an invalid response. Try again later.', {
      reason: 'proxiedmail_invalid_response'
    });
  }
  return result.data;
};
