import { buildApiServiceError, createApiServiceError } from 'slates';

export let launchDarklyServiceError = (message: string, reason: string) =>
  createApiServiceError(message, { reason });

export let launchDarklyApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'LaunchDarkly',
    operation,
    reason: 'launchdarkly_api_error',
    detailKeys: ['message', 'error', 'error_description', 'code'],
    nestedKeys: ['errors'],
    extractUpstreamCode: (input, response, helpers) => {
      let code = helpers.isRecord(response?.data)
        ? (response.data.code ?? response.data.error)
        : undefined;
      if (code === undefined && helpers.isRecord(input) && input.name === 'SlateError') {
        let data = helpers.isRecord(input.data) ? input.data : undefined;
        let upstream = helpers.isRecord(data?.upstream) ? data.upstream : undefined;
        code = upstream?.code;
      }
      return typeof code === 'string' || typeof code === 'number' ? String(code) : undefined;
    }
  });
