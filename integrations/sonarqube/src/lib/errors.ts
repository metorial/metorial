import { buildApiServiceError, createApiServiceError } from 'slates';

export let sonarqubeValidationError = (message: string) =>
  createApiServiceError(message, { reason: 'sonarqube_validation_error' });

export let sonarqubeApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'SonarQube',
    operation,
    reason: 'sonarqube_api_error',
    detailKeys: ['msg', 'message', 'error', 'detail', 'code'],
    nestedKeys: ['errors', 'error', 'details'],
    extractMessage: (input, helpers) => {
      let response = helpers.getResponse(input);
      let details: string[] = [];
      helpers.collectDetails(response?.data, details, {
        detailKeys: ['msg', 'message', 'error', 'detail', 'code'],
        nestedKeys: ['errors', 'error', 'details']
      });

      if (details.length > 0) return details.join(' - ');
      if (response?.status === 429) {
        return 'Rate limit reached. Wait a few minutes before retrying the operation.';
      }
      if (input instanceof Error && input.message) return input.message;
      return undefined;
    },
    formatMessage: ({ providerLabel, operation, statusLabel, message, status }) => {
      let retryHint =
        status === 429
          ? ' SonarQube Cloud may rate-limit API calls; wait a few minutes before retrying.'
          : '';
      return `${providerLabel} API ${operation} failed: ${statusLabel}${message}${retryHint}`;
    }
  });
