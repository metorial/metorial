import { buildApiServiceError, createApiServiceError } from 'slates';

export let sapValidationError = (message: string) =>
  createApiServiceError(message, { reason: 'sap_s4hana_validation_error' });

export let sapApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'SAP S/4HANA',
    operation,
    reason: 'sap_s4hana_api_error',
    detailKeys: [
      'message',
      'value',
      'code',
      'error',
      'error_description',
      'detail',
      'severity'
    ],
    nestedKeys: ['error', 'innererror', 'errordetails', 'details'],
    extractMessage: (input, helpers) => {
      let response = helpers.getResponse(input);
      let details: string[] = [];
      helpers.collectDetails(response?.data, details, {
        detailKeys: [
          'message',
          'value',
          'code',
          'error',
          'error_description',
          'detail',
          'severity'
        ],
        nestedKeys: ['error', 'innererror', 'errordetails', 'details']
      });

      if (details.length > 0) return details.join(' - ');
      if (input instanceof Error && input.message) return input.message;
      return undefined;
    }
  });
