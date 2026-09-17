import { buildApiServiceError } from 'slates';

export let lodgifyApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'Lodgify',
    operation,
    reason: 'lodgify_api_error',
    detailKeys: ['message', 'code', 'correlation_id', 'detail', 'title'],
    extractUpstreamCode: (_error, response, helpers) => {
      if (!helpers.isRecord(response?.data)) return undefined;

      let code = response.data.code;
      return typeof code === 'string' || typeof code === 'number' ? String(code) : undefined;
    }
  });
