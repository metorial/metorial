import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let addDetail = (details: string[], value: unknown) => {
  if (typeof value !== 'string') {
    return;
  }

  let trimmed = value.trim();
  if (trimmed && !details.includes(trimmed)) {
    details.push(trimmed);
  }
};

let extractEvernoteErrorMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let data = response?.data ?? (isRecord(error) ? error.data : undefined);
  let details: string[] = [];

  if (isRecord(data)) {
    for (let key of ['message', 'error', 'error_description', 'detail']) {
      addDetail(details, data[key]);
    }
  } else {
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

let getEvernoteErrorStatus = (error: unknown) => {
  if (!isRecord(error)) {
    return undefined;
  }

  let response = error.response as ErrorResponse | undefined;
  return response?.status ?? error.status;
};

export class EvernoteError extends ServiceError<any> {
  errorCode: number;
  parameter?: string;
  rateLimitDuration?: number;

  constructor(
    message: string,
    errorCode: number,
    parameter?: string,
    rateLimitDuration?: number
  ) {
    super(badRequestError({ message }));
    this.name = 'EvernoteError';
    this.errorCode = errorCode;
    this.parameter = parameter;
    this.rateLimitDuration = rateLimitDuration;
    this.data.reason = 'evernote_api_error';
    this.data.evernoteErrorCode = errorCode;

    if (parameter) {
      this.data.parameter = parameter;
    }

    if (rateLimitDuration !== undefined) {
      this.data.rateLimitDuration = rateLimitDuration;
    }
  }
}

export let evernoteServiceError = (message: string, reason = 'evernote_error') => {
  let error = new ServiceError(badRequestError({ message }));
  error.data.reason = reason;
  return error;
};

export let evernoteApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = getEvernoteErrorStatus(error);
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  let serviceError = evernoteServiceError(
    `Evernote API ${operation} failed: ${statusLabel}${extractEvernoteErrorMessage(error)}`,
    'evernote_api_transport_error'
  );
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};

export let requireEvernoteString = (
  value: string | undefined,
  label: string,
  action?: string
) => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw evernoteServiceError(`${label} is required${action ? ` for "${action}"` : ''}.`);
  }

  return value;
};
