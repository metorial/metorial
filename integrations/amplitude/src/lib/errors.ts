import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let addDetail = (details: string[], value: unknown) => {
  let text = typeof value === 'string' ? value.trim() : '';
  if (text && !details.includes(text)) {
    details.push(text);
  }
};

let getErrorResponse = (error: unknown) =>
  isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;

let extractAmplitudeMessage = (error: unknown) => {
  let data = getErrorResponse(error)?.data;
  let details: string[] = [];

  if (isRecord(data)) {
    addDetail(details, data.error);
    addDetail(details, data.message);
    addDetail(details, data.type);
    addDetail(details, data.status);

    let metadata = data.metadata;
    if (isRecord(metadata)) {
      addDetail(details, metadata.message);
      addDetail(details, metadata.reason);
    }
  } else if (typeof data === 'string') {
    addDetail(details, data);
  }

  if (details.length > 0) {
    return details.join(' - ');
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
};

export let amplitudeServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let amplitudeApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = getErrorResponse(error);
  let statusLabel =
    response?.status !== undefined
      ? `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}: `
      : '';
  let serviceError = amplitudeServiceError(
    `Amplitude API ${operation} failed: ${statusLabel}${extractAmplitudeMessage(error)}`
  );

  serviceError.data.reason = 'amplitude_api_error';
  serviceError.data.upstreamStatus = response?.status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
