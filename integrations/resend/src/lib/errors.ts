import { buildApiServiceError } from 'slates';

export let resendApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'Resend',
    operation,
    reason: 'resend_api_error',
    detailKeys: ['message', 'name', 'code', 'statusCode'],
    nestedKeys: ['errors'],
    extractUpstreamCode: (_input, response, helpers) => {
      if (!helpers.isRecord(response?.data)) return undefined;

      if (typeof response.data.name === 'string') return response.data.name;
      if (typeof response.data.code === 'string') return response.data.code;

      return undefined;
    }
  });
