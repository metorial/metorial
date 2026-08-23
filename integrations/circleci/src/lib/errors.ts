import { buildApiServiceError } from 'slates';

export let circleCiApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'CircleCI',
    operation,
    reason: 'circleci_api_error',
    detailKeys: ['message', 'error', 'detail', 'code']
  });
