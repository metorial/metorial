import { buildApiServiceError } from 'slates';

export let webflowApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'Webflow',
    operation,
    reason: 'webflow_api_error',
    detailKeys: ['message', 'error', 'error_description', 'detail', 'code'],
    nestedKeys: ['errors'],
    extractUpstreamCode: (_input, response, helpers) => {
      if (!helpers.isRecord(response?.data)) return undefined;

      let code = response.data.code ?? response.data.error;
      return typeof code === 'string' || typeof code === 'number' ? String(code) : undefined;
    }
  });
