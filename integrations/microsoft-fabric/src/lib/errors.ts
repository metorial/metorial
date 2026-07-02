import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
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

  for (let key of ['message', 'error_description', 'error', 'detail', 'title', 'code']) {
    pushString(messages, value[key]);
  }

  let nestedError = value.error;
  if (isRecord(nestedError)) {
    collectMessages(nestedError, messages);
  }

  let details = value.details;
  if (Array.isArray(details)) {
    for (let detail of details) collectMessages(detail, messages);
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

export let fabricServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let fabricValidationError = (message: string) => fabricServiceError(message);

export let fabricApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) return error;

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = response?.status;
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  let serviceError = fabricServiceError(
    `Microsoft Fabric ${operation} failed: ${statusLabel}${extractMessage(error)}`
  );
  serviceError.data.reason = 'microsoft_fabric_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};

export let fabricOAuthError = (error: unknown, operation = 'OAuth request') => {
  if (error instanceof ServiceError) return error;

  let serviceError = fabricApiError(error, operation);
  serviceError.data.reason = 'microsoft_fabric_oauth_error';
  return serviceError;
};
