import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

type HttpErrorInput = {
  operation: string;
  status: number;
  statusText?: string;
  body?: unknown;
  contentType?: string;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let pushString = (messages: string[], value: unknown) => {
  if (typeof value !== 'string') return;

  let trimmed = value.trim();
  if (trimmed && !messages.includes(trimmed)) {
    messages.push(trimmed);
  }
};

let collectMessages = (value: unknown, messages: string[]) => {
  if (!isRecord(value)) {
    pushString(messages, value);
    return;
  }

  for (let key of ['message', 'error_description', 'error', 'detail', 'title']) {
    pushString(messages, value[key]);
  }

  let errors = value.errors;
  if (Array.isArray(errors)) {
    for (let error of errors) collectMessages(error, messages);
  } else if (isRecord(errors)) {
    collectMessages(errors, messages);
  }
};

let extractMessage = (error: unknown) => {
  let messages: string[] = [];
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;

  collectMessages(response?.data ?? error, messages);

  if (messages.length > 0) return messages.join(' - ');
  if (error instanceof Error && error.message) return error.message;

  return 'Unknown error';
};

export let metorialServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let metorialValidationError = (message: string) => metorialServiceError(message);

export let metorialUnsupportedContentTypeError = (
  operation: string,
  contentType: string | undefined
) => {
  let serviceError = metorialServiceError(
    `Metorial API ${operation} returned unsupported content type: ${contentType ?? 'unknown'}`
  );
  serviceError.data.reason = 'unsupported_content_type';
  serviceError.data.contentType = contentType;
  return serviceError;
};

export let metorialHttpError = (input: HttpErrorInput) => {
  let statusLabel = `HTTP ${input.status}${input.statusText ? ` ${input.statusText}` : ''}`;
  let serviceError = metorialServiceError(
    `Metorial API ${input.operation} failed: ${statusLabel}: ${extractMessage(input.body)}`
  );

  serviceError.data.reason = 'metorial_api_error';
  serviceError.data.upstreamStatus = input.status;
  serviceError.data.contentType = input.contentType;

  return serviceError;
};

export let metorialApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) return error;

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = response?.status;
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  let serviceError = metorialServiceError(
    `Metorial API ${operation} failed: ${statusLabel}${extractMessage(error)}`
  );

  serviceError.data.reason = 'metorial_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};

export let metorialOAuthError = (operation: string, error: unknown) => {
  if (error instanceof ServiceError) return error;

  let serviceError = metorialApiError(error, `OAuth ${operation}`);
  serviceError.data.reason = 'metorial_oauth_error';
  return serviceError;
};
