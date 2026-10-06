import { ServiceError } from '@lowerdeck/error';
import { buildApiServiceError, getApiErrorStatus } from 'slates';

export let deelError = (error: unknown, operation: string) => {
  if (error instanceof ServiceError) return error;
  let status = getApiErrorStatus(error);
  return buildApiServiceError(
    { response: { status } },
    {
      providerLabel: 'Deel',
      reason: 'deel_api',
      operation,
      parent: {},
      formatMessage: () =>
        `Deel could not complete ${operation}${status ? ` (HTTP ${status})` : ''}. ${status === 401 || status === 403 ? 'Check the token, app type, permissions and OAuth client ID.' : status === 429 ? 'Try again after the rate limit resets.' : 'Check the request and retry when appropriate.'}`
    }
  );
};

export let isDeelNotFound = (error: unknown) =>
  error instanceof ServiceError && error.data.upstreamStatus === 404;
