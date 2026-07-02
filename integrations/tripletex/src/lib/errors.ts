import {
  buildApiServiceError,
  collectApiErrorDetails,
  createApiServiceError,
  getApiErrorResponse,
  isApiErrorRecord
} from 'slates';

export let tripletexValidationError = (message: string) =>
  createApiServiceError(message, { reason: 'tripletex_validation_error' });

let collectTripletexDetails = (value: unknown, details: string[]) => {
  collectApiErrorDetails(value, details, {
    detailKeys: ['message', 'developerMessage', 'field', 'code', 'requestId'],
    nestedKeys: ['validationMessages', 'errors'],
    includeNumbers: true
  });
};

export let tripletexApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'Tripletex',
    reason: 'tripletex_api_error',
    operation,
    extractMessage: currentError => {
      let response = getApiErrorResponse(currentError);
      let details: string[] = [];
      collectTripletexDetails(response?.data, details);
      collectTripletexDetails(currentError, details);

      return details.length > 0 ? details.join(' - ') : undefined;
    },
    extractUpstreamCode: (_currentError, response) => {
      if (!isApiErrorRecord(response?.data)) return undefined;
      let code = response.data.code;
      return code === undefined ? undefined : String(code);
    }
  });
