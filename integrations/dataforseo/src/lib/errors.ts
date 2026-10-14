import { buildApiServiceError, createApiServiceError } from 'slates';

export let dataForSEOServiceError = (message: string) =>
  createApiServiceError(message, { reason: 'dataforseo_validation_error' });

export let dataForSEOApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'DataForSEO',
    operation,
    reason: 'dataforseo_api_error',
    detailKeys: ['status_message', 'message', 'error'],
    nestedKeys: ['tasks', 'errors'],
    extractResponse: (error, helpers) => {
      let response = helpers.getResponse(error);
      if (
        !helpers.isRecord(error) ||
        error.name !== 'SlateError' ||
        !helpers.isRecord(error.data)
      ) {
        return response;
      }

      let baggage = helpers.isRecord(error.data.baggage) ? error.data.baggage : undefined;
      let status = response?.status ?? error.data.upstreamStatus;
      return {
        ...response,
        status: typeof status === 'number' || typeof status === 'string' ? status : undefined,
        data: baggage?.response
      };
    },
    extractUpstreamCode: (_error, response, helpers) => {
      if (!helpers.isRecord(response?.data)) return undefined;
      let code = response.data.status_code;
      return typeof code === 'number' ? String(code) : undefined;
    }
  });
