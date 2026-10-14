import { buildApiServiceError, getApiErrorResponse, isApiErrorRecord } from 'slates';

export let toUniOneError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'UniOne',
    reason: 'unione_api_error',
    operation,
    extractResponse: value => {
      let response = getApiErrorResponse(value);
      if (!isApiErrorRecord(value) || !isApiErrorRecord(value.data)) return response;
      let baggage = value.data.baggage;
      if (!isApiErrorRecord(baggage) || baggage.response === undefined) return response;
      return { ...response, data: baggage.response };
    },
    extractUpstreamCode: (_value, response) => {
      if (!isApiErrorRecord(response?.data)) return undefined;
      let code = response.data.code;
      return typeof code === 'number' || typeof code === 'string' ? String(code) : undefined;
    }
  });
