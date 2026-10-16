import { buildApiServiceError, createApiServiceError, extractApiErrorMessage } from 'slates';

let credentialKey =
  /^(?:authorization|consumer_?key|consumer_?secret|access_?token(?:_?secret)?|token(?:_?secret)?|oauth_(?:token(?:_secret)?|consumer_key|signature)|api_?key)$/i;

/** Remove account credentials while retaining provider-scoped media URL signatures. */
export let redactCredentials = <T>(value: T, secrets: readonly string[] = []): T => {
  if (typeof value === 'string') {
    let result = value.replace(
      /([?&](?:oauth_(?:token(?:_secret)?|consumer_key|signature)|api_?key|access_token|consumer_secret)=)[^&#\s]*/gi,
      '$1[redacted]'
    );
    for (let secret of secrets.filter(item => item.length >= 4)) {
      result = result.split(secret).join('[redacted]');
      result = result.split(encodeURIComponent(secret)).join('[redacted]');
    }
    return result as T;
  }
  if (Array.isArray(value)) return value.map(item => redactCredentials(item, secrets)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        credentialKey.test(key) ? '[redacted]' : redactCredentials(item, secrets)
      ])
    ) as T;
  }
  return value;
};

export let smugMugError = (
  error: unknown,
  operation: string,
  secrets: readonly string[] = []
) =>
  buildApiServiceError(error, {
    providerLabel: 'SmugMug',
    reason: 'smugmug_api_error',
    operation,
    extractResponse: (input, helpers) => {
      let response = helpers.getResponseWithBody(input);
      return response
        ? { ...response, data: redactCredentials(response.data, secrets) }
        : undefined;
    },
    extractMessage: (input, helpers) => {
      let response = helpers.getResponseWithBody(input);
      let message = input instanceof Error ? input.message : undefined;
      return extractApiErrorMessage(
        {
          response: response
            ? { ...response, data: redactCredentials(response.data, secrets) }
            : undefined,
          message: redactCredentials(message, secrets)
        },
        {
          detailKeys: [
            'Message',
            'message',
            'Text',
            'text',
            'detail',
            'error',
            'oauth_problem'
          ],
          nestedKeys: ['Errors', 'errors', 'Response'],
          fallbackMessage: redactCredentials(message, secrets)
        }
      );
    },
    parent: { provider: 'SmugMug' }
  });

export let requireRecord = (value: unknown, label: string): Record<string, any> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw createApiServiceError(`SmugMug returned an invalid ${label}.`, {
      reason: 'invalid_response'
    });
  }
  return value;
};

export let requireString = (value: unknown, label: string): string => {
  if (typeof value !== 'string') {
    throw createApiServiceError(`SmugMug returned an invalid ${label}.`, {
      reason: 'invalid_response'
    });
  }
  return value;
};
