import { badRequestError, ServiceError } from '@lowerdeck/error';

export let pdf4meServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let pdf4meUpstreamError = (
  message: string,
  options: {
    reason?: string;
    status?: number | string;
    parent?: unknown;
  } = {}
) => {
  let error = pdf4meServiceError(message);
  error.data.reason = options.reason ?? 'pdf4me_upstream_error';
  error.data.upstreamStatus = options.status;

  if (options.parent instanceof Error) {
    error.setParent(options.parent);
  }

  return error;
};

export let toPdf4meServiceError = (error: unknown, fallbackMessage: string) => {
  if (error instanceof ServiceError) {
    return error;
  }

  let maybeResponse = (error as any)?.response;
  let responseData = maybeResponse?.data;
  let message =
    responseData?.message ||
    responseData?.error ||
    responseData?.title ||
    (typeof responseData === 'string' ? responseData : undefined) ||
    (error instanceof Error ? error.message : undefined) ||
    fallbackMessage;

  return pdf4meUpstreamError(`${fallbackMessage}: ${message}`, {
    status: responseData?.status ?? maybeResponse?.status,
    parent: error
  });
};
