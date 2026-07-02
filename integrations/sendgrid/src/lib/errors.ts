import { buildApiServiceError } from 'slates';

export let sendgridApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'SendGrid',
    operation,
    reason: 'sendgrid_api_error',
    detailKeys: [
      'message',
      'error',
      'error_description',
      'error_id',
      'id',
      'field',
      'parameter'
    ],
    nestedKeys: ['errors'],
    extractUpstreamCode: (_input, response, helpers) => {
      if (!helpers.isRecord(response?.data)) return undefined;

      if (typeof response.data.error === 'string') return response.data.error;
      if (typeof response.data.error_id === 'string') return response.data.error_id;

      return undefined;
    }
  });
