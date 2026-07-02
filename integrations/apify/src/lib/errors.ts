import { buildApiServiceError, createApiServiceError } from 'slates';

export let apifyValidationError = (message: string) =>
  createApiServiceError(message, { reason: 'apify_validation_error' });

export let apifyApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'Apify',
    operation,
    reason: 'apify_api_error',
    detailKeys: ['message', 'error', 'detail', 'code', 'type'],
    nestedKeys: ['errors', 'details', 'error']
  });
