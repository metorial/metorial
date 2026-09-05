import { buildApiServiceError, createApiServiceError } from 'slates';

export let datadogServiceError = createApiServiceError;

export let datadogApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'Datadog',
    reason: 'datadog_api_error',
    operation,
    detailKeys: ['message', 'detail', 'error', 'title']
  });
