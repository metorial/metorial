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
    extractUpstreamCode: (_input, response, helpers) => {
      if (!helpers.isRecord(response?.data)) return undefined;

      let code = response.data.code ?? response.data.error;
      return typeof code === 'string' || typeof code === 'number' ? String(code) : undefined;
    }
  });
