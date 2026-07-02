import {
  buildApiServiceError,
  collectApiErrorDetails,
  createApiServiceError,
  getApiErrorResponse,
  isApiErrorRecord
} from 'slates';

export let fikenValidationError = (message: string) =>
  createApiServiceError(message, { reason: 'fiken_validation_error' });

let collectFikenDetails = (value: unknown, details: string[]) => {
  collectApiErrorDetails(value, details, {
    detailKeys: ['message', 'error_description', 'error', 'field', 'code', 'requestId'],
    nestedKeys: ['errors', 'validationMessages', 'details'],
    includeNumbers: true
  });
};

export let fikenApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'Fiken',
    reason: 'fiken_api_error',
    operation,
    extractMessage: currentError => {
      let response = getApiErrorResponse(currentError);
      let details: string[] = [];
      collectFikenDetails(response?.data, details);
      collectFikenDetails(currentError, details);

      return details.length > 0 ? details.join(' - ') : undefined;
    },
    extractUpstreamCode: (_currentError, response) => {
      if (!isApiErrorRecord(response?.data)) return undefined;
      let code = response.data.code ?? response.data.error;
      return code === undefined ? undefined : String(code);
    }
  });
