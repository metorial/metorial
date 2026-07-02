import { buildApiServiceError } from 'slates';

export let renderApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'Render',
    operation,
    reason: 'render_api_error'
  });
