import { ServiceError } from '@lowerdeck/error';
import { buildApiServiceError, getApiErrorResponse, isApiErrorRecord } from 'slates';

export const contextApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) return error;
  const data = isApiErrorRecord(error) && isApiErrorRecord(error.data) ? error.data : {};
  const upstream = isApiErrorRecord(data.upstream) ? data.upstream : {};
  const baggage = isApiErrorRecord(data.baggage) ? data.baggage : {};
  const responseBody = getApiErrorResponse(error)?.data;
  const body = isApiErrorRecord(baggage.response)
    ? baggage.response
    : isApiErrorRecord(responseBody)
      ? responseBody
      : {};
  const mapped = buildApiServiceError(error, {
    providerLabel: 'Context.dev',
    reason: 'context_api_error',
    operation,
    extractUpstreamCode: (_error, response) => {
      const responseBody = isApiErrorRecord(response?.data) ? response.data : body;
      const code = upstream.code ?? responseBody.error_code;
      return typeof code === 'string' ? code : undefined;
    }
  });
  const requestId = upstream.requestId ?? body.request_id;
  if (typeof requestId === 'string' && /^[A-Za-z0-9_-]{1,200}$/.test(requestId)) {
    mapped.data.requestId = requestId;
  }
  if (
    typeof body.required_permission === 'string' &&
    /^[A-Za-z0-9:_-]{1,200}$/.test(body.required_permission)
  ) {
    mapped.data.requiredPermission = body.required_permission;
  }
  return mapped;
};
