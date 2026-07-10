import { buildApiServiceError, createApiServiceError, SlateError } from '@slates/provider';

export let bitbucketServiceError = (message: string) =>
  createApiServiceError(message, { reason: 'bitbucket_validation_error' });

export let bitbucketApiError = (error: unknown, operation = 'request') => {
  if (SlateError.is(error)) {
    return error;
  }

  return buildApiServiceError(error, {
    providerLabel: 'Bitbucket',
    operation,
    reason: 'bitbucket_api_error',
    detailKeys: ['message', 'error_description', 'error', 'detail'],
    nestedKeys: ['error', 'errors']
  });
};
