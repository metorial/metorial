import { buildApiServiceError, createApiServiceError } from 'slates';

export let ablyError = (error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'Ably',
    reason: 'ably_api_error',
    extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
    detailKeys: ['message', 'detail', 'code'],
    nestedKeys: ['error', 'errors', 'details'],
    extractUpstreamCode: (_error, response, helpers) => {
      let data = response?.data;
      if (!helpers.isRecord(data)) return undefined;
      let detail = helpers.isRecord(data.error) ? data.error : data;
      return typeof detail.code === 'number' || typeof detail.code === 'string'
        ? String(detail.code)
        : undefined;
    }
  });

export let requireAblyAuth = (
  token: string,
  authType: string | undefined,
  expected: 'api_key' | 'control_token'
) => {
  if (!token?.trim())
    throw createApiServiceError('Ably credentials are missing. Reconnect your account.');
  if (authType !== undefined && authType !== expected) {
    throw createApiServiceError(
      expected === 'api_key'
        ? 'This operation requires API Key authentication. Connect an Ably API key.'
        : 'This operation requires Control API Token authentication. Connect an Ably Control API token.'
    );
  }
};
