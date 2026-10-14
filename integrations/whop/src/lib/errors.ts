import { buildApiServiceError } from 'slates';

export let whopApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'Whop',
    reason: 'whop_api_error',
    operation,
    nestedKeys: ['error', 'errors'],
    extractResponse: (error, helpers) => {
      let response = helpers.getResponse(error);
      if (!helpers.isRecord(error) || !helpers.isRecord(error.data)) return response;
      let upstream = helpers.isRecord(error.data.upstream) ? error.data.upstream : undefined;
      let baggage = helpers.isRecord(error.data.baggage) ? error.data.baggage : undefined;
      let status = upstream?.status ?? response?.status;
      return {
        ...response,
        status: typeof status === 'number' || typeof status === 'string' ? status : undefined,
        data: baggage?.response ?? response?.data
      };
    },
    extractUpstreamCode: (error, response, helpers) => {
      let body = helpers.isRecord(response?.data) ? response.data : undefined;
      let details = helpers.isRecord(body?.error) ? body.error : body;
      let code = details?.code ?? (typeof body?.error === 'string' ? body.error : undefined);
      if (typeof code === 'string') return code;
      if (!helpers.isRecord(error) || !helpers.isRecord(error.data)) return undefined;
      let upstream = helpers.isRecord(error.data.upstream) ? error.data.upstream : undefined;
      return typeof upstream?.code === 'string' ? upstream.code : undefined;
    }
  });
