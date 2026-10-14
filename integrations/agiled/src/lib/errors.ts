import {
  buildApiServiceError,
  collectApiErrorDetails,
  getApiErrorResponse,
  isApiErrorRecord
} from 'slates';

export let agiledApiError = (error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'Agiled',
    reason: 'agiled_api_error',
    extractResponse: value => {
      let response = getApiErrorResponse(value);
      if (!isApiErrorRecord(value) || !isApiErrorRecord(value.data)) return response;
      let baggage = value.data.baggage;
      if (value.name !== 'SlateError' || !isApiErrorRecord(baggage)) return response;
      return { ...response, data: baggage.response };
    },
    extractMessage: value => {
      let response = getApiErrorResponse(value);
      let body = response?.data;
      if (isApiErrorRecord(value) && isApiErrorRecord(value.data)) {
        let baggage = value.data.baggage;
        if (value.name === 'SlateError' && isApiErrorRecord(baggage)) {
          body = baggage.response;
        }
      }

      let details: string[] = [];
      collectApiErrorDetails(body, details);
      if (isApiErrorRecord(body) && isApiErrorRecord(body.errors)) {
        for (let [field, messages] of Object.entries(body.errors)) {
          let fieldDetails: string[] = [];
          collectApiErrorDetails(messages, fieldDetails);
          if (fieldDetails.length) details.push(`${field}: ${fieldDetails.join(', ')}`);
        }
      }
      return details.length ? details.join(' - ') : undefined;
    }
  });
