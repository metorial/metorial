import { buildApiServiceError, getApiErrorStatus } from 'slates';

export const apiError = (error: unknown, operation = 'request') => {
  const status = Number(getApiErrorStatus(error)) || undefined;
  return buildApiServiceError(error, {
    providerLabel: 'Sixtyfour',
    reason: 'sixtyfour_api_error',
    operation,
    extractResponse: () => ({ status }),
    extractMessage: () => {
      if (status === 401) return 'The API key is missing, expired, or invalid.';
      if (status === 402)
        return 'Check the organization credit balance, subscription, and team spending limit.';
      if (status === 403)
        return 'The API key cannot access this resource or the requested feature or research tier is not enabled for the organization.';
      if (status === 404) return 'The requested resource was not found or is not accessible.';
      if (status === 429)
        return 'The organization rate limit was reached. Wait before retrying.';
      if (status === 400 || status === 422)
        return 'Check the request fields against the documented API requirements.';
      return 'The request could not be completed. Billable submissions are not retried automatically. A timed-out submission may have created a job; check its status before resubmitting.';
    },
    parent: {}
  });
};
