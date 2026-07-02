import { buildApiServiceError, createApiServiceError } from 'slates';

export let unimicroValidationError = (message: string) =>
  createApiServiceError(message, { reason: 'unimicro_validation_error' });

export let unimicroApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'UniMicro',
    operation,
    reason: 'unimicro_api_error',
    detailKeys: [
      'title',
      'detail',
      'message',
      'error',
      'error_description',
      'code',
      'ExceptionMessage'
    ]
  });
