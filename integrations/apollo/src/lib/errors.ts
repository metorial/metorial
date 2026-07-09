import { buildApiServiceError, createApiServiceError, SlateError } from '@slates/provider';

let detailKeys = ['message', 'error', 'error_description', 'detail', 'title'] as const;
let nestedKeys = ['error', 'errors'] as const;

export let apolloServiceError = (message: string) => createApiServiceError(message);

export let apolloApiError = (error: unknown, operation = 'request') => {
  if (SlateError.is(error)) {
    return error;
  }

  return buildApiServiceError(error, {
    providerLabel: 'Apollo',
    operation,
    reason: 'apollo_api_error',
    detailKeys,
    nestedKeys
  });
};

export let apolloOAuthError = (operation: string, error: unknown) => {
  if (SlateError.is(error)) {
    return error;
  }

  return buildApiServiceError(error, {
    providerLabel: 'Apollo',
    operation,
    reason: 'apollo_oauth_error',
    detailKeys,
    nestedKeys,
    formatMessage: ({ operation, statusLabel, message }) =>
      `Apollo OAuth ${operation} failed: ${statusLabel}${message}`
  });
};
