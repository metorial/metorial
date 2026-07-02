import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let addUnique = (values: string[], value: unknown) => {
  let text =
    typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';

  if (text && !values.includes(text)) {
    values.push(text);
  }
};

let collectTikTokMessages = (value: unknown, messages: string[]) => {
  if (!isRecord(value)) {
    addUnique(messages, value);
    return;
  }

  let nestedError = value.error;
  if (isRecord(nestedError)) {
    addUnique(messages, nestedError.code);
    addUnique(messages, nestedError.message);
    addUnique(messages, nestedError.log_id);
    addUnique(messages, nestedError.logid);
  } else {
    addUnique(messages, nestedError);
  }

  for (let key of ['error_description', 'message', 'code', 'request_id', 'log_id', 'logid']) {
    addUnique(messages, value[key]);
  }
};

let extractTikTokMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let data = response?.data;
  let messages: string[] = [];

  if (data !== undefined) {
    collectTikTokMessages(data, messages);
  } else {
    collectTikTokMessages(error, messages);
  }

  if (messages.length > 0) {
    return messages.join(' - ');
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
};

let getErrorStatus = (error: unknown) => {
  if (!isRecord(error)) {
    return undefined;
  }

  let response = error.response as ErrorResponse | undefined;
  return response?.status;
};

let getErrorStatusText = (error: unknown) => {
  if (!isRecord(error)) {
    return undefined;
  }

  let response = error.response as ErrorResponse | undefined;
  return response?.statusText;
};

export let tiktokServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let tiktokApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let status = getErrorStatus(error);
  let statusText = getErrorStatusText(error);
  let statusLabel =
    status !== undefined ? `HTTP ${status}${statusText ? ` ${statusText}` : ''}: ` : '';
  let serviceError = tiktokServiceError(
    `TikTok API ${operation} failed: ${statusLabel}${extractTikTokMessage(error)}`
  );

  serviceError.data.reason = 'tiktok_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};

export let tiktokOAuthError = (operation: string, error: unknown) => {
  if (error instanceof ServiceError) {
    return error;
  }

  let serviceError = tiktokServiceError(
    `TikTok OAuth ${operation} failed: ${extractTikTokMessage(error)}`
  );

  serviceError.data.reason = 'tiktok_oauth_error';
  serviceError.data.upstreamStatus = getErrorStatus(error);

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};

export let assertConsumerSuccess = (payload: unknown, operation: string) => {
  if (!isRecord(payload)) {
    return;
  }

  let error = payload.error;
  if (!isRecord(error)) {
    return;
  }

  let code = typeof error.code === 'string' ? error.code : undefined;
  if (!code || code === 'ok') {
    return;
  }

  let message =
    typeof error.message === 'string' && error.message.trim()
      ? error.message.trim()
      : 'Unknown error';
  let serviceError = tiktokServiceError(
    `TikTok API ${operation} failed: ${code}${message ? ` - ${message}` : ''}`
  );

  serviceError.data.reason = 'tiktok_api_error';
  serviceError.data.upstreamCode = code;
  serviceError.data.logId = error.log_id ?? error.logid;

  throw serviceError;
};

export let assertBusinessSuccess = (payload: unknown, operation: string) => {
  if (!isRecord(payload)) {
    return;
  }

  let code = payload.code;
  if (code === undefined || code === 0 || code === '0') {
    return;
  }

  let message =
    typeof payload.message === 'string' && payload.message.trim()
      ? payload.message.trim()
      : 'Unknown error';
  let serviceError = tiktokServiceError(
    `TikTok Business API ${operation} failed: ${String(code)} - ${message}`
  );

  serviceError.data.reason = 'tiktok_business_api_error';
  serviceError.data.upstreamCode = code;
  serviceError.data.requestId = payload.request_id;

  throw serviceError;
};
