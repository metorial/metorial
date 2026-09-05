import { buildApiServiceError, createApiServiceError } from 'slates';

export { createApiServiceError as amplitudeServiceError } from 'slates';

export let amplitudeApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'Amplitude',
    reason: 'amplitude_api_error',
    operation,
    detailKeys: [
      'message',
      'detail',
      'details',
      'error',
      'error_description',
      'type',
      'reason'
    ],
    nestedKeys: ['errors', 'error', 'metadata']
  });

export let unexpectedAmplitudeResponse = (operation: string) =>
  createApiServiceError(`Amplitude returned an unexpected response for ${operation}.`, {
    reason: 'amplitude_invalid_response'
  });
