import { buildApiServiceError, isApiErrorRecord } from 'slates';

export let zixflowError = (error: unknown) => {
  let providerResponse: unknown;
  let result = buildApiServiceError(error, {
    providerLabel: 'Zixflow',
    reason: 'zixflow_api_error',
    fallbackMessage: 'Unexpected response: no confirmed successful status.',
    extractResponse: (error, helpers) => {
      let response = helpers.getResponseWithBody(error);
      providerResponse = response?.data;
      return response;
    },
    extractUpstreamCode: (_error, response) => {
      let body = response?.data;
      return isApiErrorRecord(body) &&
        (typeof body.code === 'string' || typeof body.code === 'number')
        ? String(body.code)
        : undefined;
    }
  });
  if (providerResponse !== undefined) {
    Object.assign(result.data, { providerResponse });
  }
  return result;
};
