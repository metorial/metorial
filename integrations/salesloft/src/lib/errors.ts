import { buildApiServiceError, getApiErrorStatus } from 'slates';
export const apiFailure = (operation: string, error: unknown) => {
  const value = getApiErrorStatus(error);
  const status =
    typeof value === 'number' && Number.isInteger(value) && value >= 100 && value <= 599
      ? value
      : undefined;
  return buildApiServiceError(
    { response: { status } },
    {
      providerLabel: 'Salesloft',
      operation,
      reason: 'salesloft_api_error',
      parent: {},
      formatMessage: () =>
        `Salesloft ${operation} failed${status ? ` (HTTP ${status})` : ''}. ${status === 401 ? 'Reconnect or check the API key.' : status === 403 ? 'Check app scopes, key owner permissions and feature access.' : status === 429 ? 'The team API budget is exhausted; wait for the rate limit to reset.' : 'Check identifiers and parameters before retrying; reconcile uncertain writes first.'}`
    }
  );
};
