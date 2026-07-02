import { buildApiServiceError, createApiServiceError } from 'slates';

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export let powerOfficeValidationError = (message: string) =>
  createApiServiceError(message, { reason: 'poweroffice_validation_error' });

export let powerOfficeApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'PowerOffice',
    operation,
    reason: 'poweroffice_api_error',
    detailKeys: ['title', 'detail', 'message', 'error', 'error_description', 'code'],
    extractMessage: (input, helpers) => {
      if (isRecord(input) && isRecord(input.data)) {
        let message = input.data.message;
        if (typeof message === 'string' && message.trim()) return message;
      }

      if (isRecord(input) && isRecord(input.baggage)) {
        let response = input.baggage.response;
        let details: string[] = [];
        helpers.collectDetails(response, details, {
          detailKeys: ['title', 'detail', 'message', 'error', 'error_description', 'code']
        });
        if (details.length > 0) return details.join(' - ');
      }

      if (input instanceof Error && input.message) return input.message;
      return undefined;
    },
    extractStatus: (input, response, helpers) =>
      response?.status ??
      (helpers.isRecord(input) && typeof input.status === 'number'
        ? input.status
        : undefined) ??
      (helpers.isRecord(input) &&
      helpers.isRecord(input.upstream) &&
      typeof input.upstream.status === 'number'
        ? input.upstream.status
        : undefined)
  });
