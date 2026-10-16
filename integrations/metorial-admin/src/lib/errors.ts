import { ServiceError } from '@lowerdeck/error';
import { buildApiServiceError, createApiServiceError } from 'slates';

type HttpErrorInput = {
  operation: string;
  status: number;
  statusText?: string;
  body?: unknown;
  contentType?: string;
};

export let metorialServiceError = createApiServiceError;
export let metorialValidationError = createApiServiceError;

export let metorialUnsupportedContentTypeError = (
  operation: string,
  contentType: string | undefined
) => {
  let error = createApiServiceError(
    `Metorial API ${operation} returned unsupported content type: ${contentType ?? 'unknown'}`,
    { reason: 'unsupported_content_type' }
  );
  error.data.contentType = contentType;
  return error;
};

export let metorialApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'Metorial',
    reason: 'metorial_api_error',
    operation,
    extractResponse: (value, helpers) => helpers.getResponseWithBody(value),
    detailKeys: ['message', 'error_description', 'detail', 'title', 'code'],
    nestedKeys: ['errors', 'error'],
    extractUpstreamCode: (_value, response, helpers) => {
      if (!helpers.isRecord(response?.data)) return undefined;
      let code = response.data.code ?? response.data.error;
      return typeof code === 'string' ? code : undefined;
    }
  });

export let metorialHttpError = (input: HttpErrorInput) => {
  let data = input.body;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      // Non-JSON error responses remain available to the shared error adapter.
    }
  }
  let error = metorialApiError(
    { response: { status: input.status, statusText: input.statusText, data } },
    input.operation
  );
  error.data.contentType = input.contentType;
  return error;
};

export let metorialOAuthError = (operation: string, error: unknown) => {
  if (error instanceof ServiceError) return error;
  let serviceError = metorialApiError(error, `OAuth ${operation}`);
  serviceError.data.reason = 'metorial_oauth_error';
  return serviceError;
};
