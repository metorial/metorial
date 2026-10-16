import { buildApiServiceError, createAuthenticatedAxios, isApiErrorRecord } from 'slates';

export type AuthType = {
  token: string;
  authType: 'iam_token' | 'api_key';
};

export let getAuthHeader = (auth: AuthType): string => {
  if (auth.authType === 'api_key') {
    return `Api-Key ${auth.token}`;
  }
  return `Bearer ${auth.token}`;
};

export let createServiceClient = (baseURL: string, auth: AuthType) => {
  let client = createAuthenticatedAxios({
    baseURL,
    authHeader: { value: getAuthHeader(auth) },
    errorAdapter: error =>
      buildApiServiceError(error, {
        providerLabel: 'Yandex Cloud',
        reason: 'yandex_api_failed',
        extractResponse: (input, helpers) => helpers.getResponseWithBody(input)
      })
  });

  // Cloud management mutations can return a failed Operation with HTTP 200.
  // Function invocation responses remain application-owned and pass through.
  if (baseURL.endsWith('.api.cloud.yandex.net')) {
    client.interceptors.response.use(response => {
      let result: unknown = response.data;
      if (
        isApiErrorRecord(result) &&
        typeof result.id === 'string' &&
        isApiErrorRecord(result.error) &&
        typeof result.error.code === 'number' &&
        result.error.code !== 0
      ) {
        throw buildApiServiceError(
          { response: { status: response.status, data: result.error } },
          { providerLabel: 'Yandex Cloud', reason: 'yandex_operation_failed' }
        );
      }
      return response;
    });
  }
  return client;
};
