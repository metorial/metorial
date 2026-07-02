import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let addDetail = (details: string[], value: unknown) => {
  if (typeof value !== 'string' && typeof value !== 'number') return;

  let detail = String(value).trim();
  if (detail && !details.includes(detail)) {
    details.push(detail);
  }
};

let collectDetails = (value: unknown, details: string[]) => {
  if (Array.isArray(value)) {
    for (let item of value) {
      collectDetails(item, details);
    }
    return;
  }

  if (!isRecord(value)) {
    addDetail(details, value);
    return;
  }

  addDetail(details, value.message);
  addDetail(details, value.error);
  addDetail(details, value.ErrorMessage);
  addDetail(details, value.ErrorDetails);
};

let extractMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let details: string[] = [];

  collectDetails(response?.data, details);
  if (isRecord(error)) {
    collectDetails(error.data, details);
  }

  if (details.length > 0) {
    return details.join(' - ');
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
};

export let ocrspaceServiceError = (message: string) => {
  let error = new ServiceError(badRequestError({ message }));
  error.data.reason = 'ocrspace_validation_error';
  return error;
};

export let ocrspaceUpstreamError = (
  message: string,
  options: {
    reason?: string;
    status?: number;
    parent?: unknown;
  } = {}
) => {
  let error = ocrspaceServiceError(message);
  error.data.reason = options.reason ?? 'ocrspace_api_error';
  error.data.upstreamStatus = options.status;

  if (options.parent instanceof Error) {
    error.setParent(options.parent);
  }

  return error;
};

export let ocrspaceApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) return error;

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let statusLabel =
    response?.status !== undefined
      ? `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  return ocrspaceUpstreamError(
    `OCR.space API ${operation} failed: ${statusLabel}${extractMessage(error)}`,
    {
      status: response?.status,
      parent: error
    }
  );
};
