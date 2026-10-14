import { buildApiServiceError, createAuthenticatedAxios, isApiErrorRecord } from 'slates';

export let toEversignApiError = (error: unknown, operation: string) =>
  buildApiServiceError(error, {
    providerLabel: 'Eversign',
    reason: 'eversign_api_error',
    operation,
    detailKeys: ['info', 'type', 'description', 'message', 'code'],
    nestedKeys: ['error', 'details'],
    extractUpstreamCode: (_error, response) => {
      let data = response?.data;
      if (!isApiErrorRecord(data) || !isApiErrorRecord(data.error)) return undefined;
      let code = data.error.type ?? data.error.code;
      return typeof code === 'string' || typeof code === 'number' ? String(code) : undefined;
    }
  });

export let createEversignAxios = (config: Parameters<typeof createAuthenticatedAxios>[0]) => {
  let axios = createAuthenticatedAxios({
    ...config,
    errorAdapter: error => toEversignApiError(error, 'request')
  });
  axios.interceptors.response.use(response => {
    if (isApiErrorRecord(response.data) && response.data.success === false) {
      throw toEversignApiError({ response }, 'request');
    }
    return response;
  });
  return axios;
};
