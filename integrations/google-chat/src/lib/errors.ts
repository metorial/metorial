import { buildApiServiceError, createApiServiceError } from 'slates';

export let googleChatApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'Google Chat',
    reason: 'google_chat_api_error',
    operation,
    detailKeys: ['message', 'reason', 'status', 'code', 'error_description'],
    nestedKeys: ['error', 'errors']
  });

export let googleChatOAuthError = (operation: string, error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'Google Chat',
    reason: 'google_chat_oauth_error',
    operation,
    detailKeys: ['message', 'error', 'error_description', 'code'],
    nestedKeys: ['errors'],
    formatMessage: ({ operation, statusLabel, message }) =>
      `Google Chat OAuth ${operation} failed: ${statusLabel}${message}`
  });

export let googleChatValidationError = (message: string, parent?: unknown) =>
  createApiServiceError(message, {
    reason: 'google_chat_validation_error',
    parent
  });
