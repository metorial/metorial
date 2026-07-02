import { ServiceError } from '@lowerdeck/error';
import { createApiServiceError } from 'slates';

export let pdfCoUpstreamError = (
  message: string,
  options: {
    reason?: string;
    status?: number | string;
    parent?: unknown;
  } = {}
) => {
  return createApiServiceError(message, {
    reason: options.reason ?? 'pdfco_upstream_error',
    upstreamStatus: options.status,
    parent: options.parent
  });
};

export let pdfCoApiError = (
  operation: string,
  response: {
    message?: string;
    status?: number | string;
  } = {}
) =>
  pdfCoUpstreamError(`${operation}: ${response.message || 'PDF.co reported an error.'}`, {
    status: response.status
  });

export let toPdfCoServiceError = (error: unknown, fallbackMessage: string) => {
  if (error instanceof ServiceError) {
    return error;
  }

  let maybeResponse = (error as any)?.response;
  let responseData = maybeResponse?.data;
  let message =
    responseData?.message ||
    responseData?.error ||
    (error instanceof Error ? error.message : undefined) ||
    fallbackMessage;

  return pdfCoUpstreamError(`${fallbackMessage}: ${message}`, {
    status: responseData?.status ?? maybeResponse?.status,
    parent: error
  });
};
