import { buildApiServiceError } from 'slates';

export let cohereApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'Cohere',
    operation,
    reason: 'cohere_api_error',
    includeNumbers: false,
    extractMessage: (input, helpers) => {
      let response = helpers.getResponse(input);
      let data = response?.data;
      let details: string[] = [];
      let collectOptions = {
        detailKeys: ['message', 'type', 'code'],
        includeNumbers: false,
        nestedKeys: []
      };

      if (helpers.isRecord(data)) {
        if (helpers.isRecord(data.error)) {
          helpers.collectDetails(data.error, details, collectOptions);
        }

        helpers.collectDetails(data.message, details, collectOptions);
        helpers.collectDetails(data.detail, details, collectOptions);
        if (!helpers.isRecord(data.error)) {
          helpers.collectDetails(data.error, details, collectOptions);
        }
      } else {
        helpers.collectDetails(data, details, collectOptions);
      }

      if (details.length > 0) return details.join(' - ');
      if (input instanceof Error && input.message) return input.message;
      return 'Unknown error';
    },
    extractStatus: (input, response, helpers) =>
      response?.status ??
      (helpers.isRecord(input) && typeof input.status === 'number'
        ? input.status
        : undefined) ??
      (helpers.isRecord(input) &&
      helpers.isRecord(input.data) &&
      typeof input.data.status === 'number'
        ? input.data.status
        : undefined)
  });
