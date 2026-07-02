import { buildApiServiceError, createApiServiceError } from 'slates';

export let vismaNetServiceError = (message: string) =>
  createApiServiceError(message, { reason: 'visma_net_validation_error' });

export let vismaNetApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'Visma Net',
    reason: 'visma_net_api_error',
    operation,
    detailKeys: [
      'message',
      'detail',
      'error',
      'error_description',
      'code',
      'exceptionMessage'
    ],
    nestedKeys: ['errors', 'modelState'],
    formatMessage: ({ providerLabel, operation, statusLabel, message, status }) => {
      let concurrencyHint =
        status === 412
          ? ' The resource changed since it was read; provide a current ETag/If-Match value before retrying.'
          : '';

      return `${providerLabel} API ${operation} failed: ${statusLabel}${message}${concurrencyHint}`;
    }
  });
