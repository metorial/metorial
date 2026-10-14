import { buildApiServiceError, getApiErrorResponse, isApiErrorRecord } from 'slates';

export let apaleoApiError = (error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'Apaleo',
    reason: 'apaleo_api_error',
    detailKeys: ['message', 'detail', 'error_description', 'error', 'code'],
    nestedKeys: ['messages', 'errors'],
    extractResponse: value => {
      let response = getApiErrorResponse(value);
      if (!isApiErrorRecord(value) || !isApiErrorRecord(value.data)) return response;
      let baggage = value.data.baggage;
      return {
        ...response,
        data: isApiErrorRecord(baggage) ? baggage.response : response?.data
      };
    },
    extractMessage: (value, helpers) => {
      let response = getApiErrorResponse(value);
      let body = response?.data;
      if (isApiErrorRecord(value) && isApiErrorRecord(value.data)) {
        let baggage = value.data.baggage;
        if (isApiErrorRecord(baggage)) body = baggage.response;
      }
      let details: string[] = [];
      helpers.collectDetails(body, details, {
        nestedKeys: ['messages', 'errors'],
        detailKeys: ['message', 'detail', 'error_description', 'error', 'code']
      });
      let message = details.join(' - ') || helpers.extractMessage(value);
      return message.includes('is no longer eligible for client')
        ? 'The connecting user no longer has the required access. Reconnect Apaleo with a user who has the required permissions and property access.'
        : message;
    }
  });
