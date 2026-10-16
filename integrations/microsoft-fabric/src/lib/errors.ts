import { ServiceError } from '@lowerdeck/error';
import { buildApiServiceError, createApiServiceError } from 'slates';

export let fabricServiceError = (message: string) => createApiServiceError(message);

export let fabricValidationError = (message: string) => fabricServiceError(message);

export let fabricApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'Microsoft Fabric',
    reason: 'microsoft_fabric_api_error',
    operation,
    extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
    detailKeys: ['message', 'error_description', 'detail', 'title', 'code', 'errorCode'],
    nestedKeys: ['error', 'details', 'moreDetails', 'errors'],
    extractUpstreamCode: (_error, response, helpers) => {
      if (!helpers.isRecord(response?.data)) return undefined;
      let data = response.data;
      let nested = helpers.isRecord(data.error) ? data.error : undefined;
      let code = data.errorCode ?? nested?.code ?? data.error;
      return typeof code === 'string' ? code : undefined;
    },
    formatMessage: ({ operation, statusLabel, message }) =>
      `Microsoft Fabric ${operation} failed: ${statusLabel}${message}`
  });

export let fabricOAuthError = (error: unknown, operation = 'OAuth request') => {
  if (error instanceof ServiceError) return error;
  let serviceError = fabricApiError(error, operation);
  serviceError.data.reason = 'microsoft_fabric_oauth_error';
  return serviceError;
};
