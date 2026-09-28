import { buildApiServiceError } from 'slates';

export { createApiServiceError as squareServiceError } from 'slates';

export let squareApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'Square',
    reason: 'square_api_error',
    operation,
    detailKeys: ['detail', 'code', 'category', 'field', 'message', 'error_description'],
    nestedKeys: ['errors', 'error'],
    extractResponse: (error, { getResponse, isRecord }) => {
      const response = getResponse(error);
      if (
        !isRecord(error) ||
        error.name !== 'SlateError' ||
        !isRecord(error.data) ||
        !isRecord(error.data.baggage)
      ) {
        return response;
      }
      return { ...response, data: error.data.baggage.response };
    },
    extractUpstreamCode: (_error, response, { isRecord }) => {
      if (!isRecord(response?.data) || !Array.isArray(response.data.errors)) return;
      let first = response.data.errors[0];
      return isRecord(first) && typeof first.code === 'string' ? first.code : undefined;
    }
  });
