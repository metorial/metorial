import {
  buildApiServiceError,
  collectApiErrorDetails,
  createApiServiceError,
  getApiErrorResponse,
  isApiErrorRecord
} from 'slates';

export let spareBankRegnskapValidationError = (message: string) =>
  createApiServiceError(message, { reason: 'sparebank_1_regnskap_validation_error' });

let collectSpareBankDetails = (value: unknown, details: string[]) => {
  collectApiErrorDetails(value, details, {
    detailKeys: [
      'message',
      'Message',
      'detail',
      'Detail',
      'error',
      'error_description',
      'code'
    ],
    nestedKeys: ['errors', 'Errors', 'validationMessages', 'ValidationMessages'],
    includeNumbers: true
  });
};

export let spareBankRegnskapApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'SpareBank 1 Regnskap',
    reason: 'sparebank_1_regnskap_api_error',
    operation,
    extractMessage: currentError => {
      let response = getApiErrorResponse(currentError);
      let details: string[] = [];
      collectSpareBankDetails(response?.data, details);
      collectSpareBankDetails(currentError, details);

      return details.length > 0 ? details.join(' - ') : undefined;
    },
    extractUpstreamCode: (_currentError, response) => {
      if (!isApiErrorRecord(response?.data)) return undefined;
      let code = response.data.code ?? response.data.Code;
      return code === undefined ? undefined : String(code);
    }
  });
