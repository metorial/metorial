import {
  type ApiErrorResponse,
  buildApiServiceError,
  extractApiErrorMessage,
  getApiErrorResponse,
  isApiErrorRecord
} from 'slates';

let getTidyErrorResponse = (error: unknown): ApiErrorResponse | undefined => {
  let response = getApiErrorResponse(error);
  if (response?.data !== undefined) return response;

  if (
    isApiErrorRecord(error) &&
    isApiErrorRecord(error.data) &&
    isApiErrorRecord(error.data.baggage) &&
    isApiErrorRecord(error.data.baggage.response)
  ) {
    return { ...response, data: error.data.baggage.response };
  }
  return response;
};

export let toTidyServiceError = (error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'TIDY',
    reason: 'tidy_api_error',
    extractResponse: getTidyErrorResponse,
    extractMessage: (original, helpers) => {
      let response = getTidyErrorResponse(original);
      let body = response?.data;
      let details: string[] = [];
      helpers.collectDetails(body, details, { detailKeys: ['message', 'code'] });

      if (isApiErrorRecord(body) && Array.isArray(body.invalid_params)) {
        for (let entry of body.invalid_params) {
          if (!isApiErrorRecord(entry)) continue;
          for (let [field, message] of Object.entries(entry)) {
            if (typeof message === 'string' && message.trim()) {
              details.push(`${field}: ${message}`);
            }
          }
        }
      }

      return details.length > 0
        ? details.join(' - ')
        : extractApiErrorMessage(original, { response });
    },
    extractUpstreamCode: (_original, response) => {
      let body = response?.data;
      return isApiErrorRecord(body) && typeof body.code === 'string' ? body.code : undefined;
    }
  });
