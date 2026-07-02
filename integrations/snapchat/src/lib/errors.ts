import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let collectMessages = (value: unknown, messages: string[]) => {
  if (!isRecord(value)) return;

  for (let key of [
    'message',
    'reason',
    'error',
    'error_description',
    'debug_message',
    'request_status',
    'sub_request_status'
  ]) {
    let detail = value[key];
    if (typeof detail === 'string' && detail.trim()) {
      messages.push(detail.trim());
    }
  }

  for (let nestedKey of ['error_data', 'errors', 'validation_errors']) {
    let nested = value[nestedKey];
    if (Array.isArray(nested)) {
      for (let item of nested) collectMessages(item, messages);
    } else {
      collectMessages(nested, messages);
    }
  }
};

let extractSnapchatMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let data = response?.data;
  let messages: string[] = [];

  if (typeof data === 'string' && data.trim()) {
    messages.push(data.trim());
  } else {
    collectMessages(data, messages);
  }

  if (messages.length > 0) {
    return [...new Set(messages)].join(' - ');
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
};

export let snapchatServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let snapchatApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = response?.status;
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  let serviceError = snapchatServiceError(
    `Snapchat API ${operation} failed: ${statusLabel}${extractSnapchatMessage(error)}`
  );

  serviceError.data.reason = 'snapchat_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
