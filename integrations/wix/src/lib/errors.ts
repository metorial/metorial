import { buildApiServiceError } from 'slates';

export let wixApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'Wix',
    operation,
    reason: 'wix_api_error',
    extractMessage: (input, helpers) => {
      let response = helpers.getResponse(input);
      let details: string[] = [];
      let collectOptions = {
        detailKeys: ['title', 'message', 'detail', 'error', 'code'],
        nestedKeys: ['details', 'errors']
      };

      if (helpers.isRecord(response?.data)) {
        helpers.collectDetails(response.data.message, details, collectOptions);
        helpers.collectDetails(response.data.details, details, collectOptions);
        helpers.collectDetails(response.data.error, details, collectOptions);
        helpers.collectDetails(response.data.errors, details, collectOptions);
      } else {
        helpers.collectDetails(response?.data, details, collectOptions);
      }

      if (details.length > 0) return details.join(' - ');
      if (input instanceof Error && input.message) return input.message;
      return 'Unknown error';
    }
  });
