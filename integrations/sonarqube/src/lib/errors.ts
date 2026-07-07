import { buildApiServiceError, createApiServiceError } from 'slates';

let PROJECT_LOOKUP_HINT =
  'Verify the project key with search_my_sonarqube_projects, check the SonarQube Cloud cloudRegion and organization config, confirm the token has Browse permission on the project, and make sure any branch or pullRequest value exists for that project.';

let PROJECT_SCOPED_OPERATIONS = new Set([
  'list project branches',
  'list project pull requests',
  'get project measures',
  'get quality gate status',
  'search issues',
  'search security hotspots',
  'get raw source',
  'get source SCM info',
  'search duplicated files',
  'get duplications'
]);

export let hasProjectLookupFailureMessage = (message: string) =>
  /project doesn't exist/i.test(message) ||
  /component key '[^']+' not found/i.test(message) ||
  /component .* not found/i.test(message) ||
  /requested resource was not found/i.test(message);

export let withProjectLookupHint = (message: string) =>
  hasProjectLookupFailureMessage(message) ? `${message} ${PROJECT_LOOKUP_HINT}` : message;

let maybeWithProjectLookupHint = (operation: string, message: string) =>
  PROJECT_SCOPED_OPERATIONS.has(operation) ? withProjectLookupHint(message) : message;

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

      if (details.length > 0) {
        return maybeWithProjectLookupHint(operation, details.join(' - '));
      }
      if (response?.status === 429) {
        return 'Rate limit reached. Wait a few minutes before retrying the operation.';
      }
      if (input instanceof Error && input.message) {
        return maybeWithProjectLookupHint(operation, input.message);
      }
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
