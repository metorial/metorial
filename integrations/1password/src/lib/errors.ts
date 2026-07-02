import { buildApiServiceError } from 'slates';

export let onePasswordApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: '1Password',
    operation,
    reason: 'onepassword_api_error',
    detailKeys: ['message', 'error', 'error_description'],
    includeNumbers: false,
    nestedKeys: [],
    extractStatus: (input, response, helpers) =>
      response?.status ??
      (helpers.isRecord(input) && typeof input.status === 'number'
        ? input.status
        : undefined) ??
      (helpers.isRecord(input) &&
      helpers.isRecord(input.data) &&
      typeof input.data.status === 'number'
        ? input.data.status
        : undefined)
  });
