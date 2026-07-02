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

  for (let key of ['detail', 'message', 'title', 'error', 'error_description']) {
    let detail = value[key];
    if (typeof detail === 'string' && detail.trim()) {
      messages.push(detail.trim());
    }
  }

  let errors = value.errors;
  if (Array.isArray(errors)) {
    for (let error of errors) {
      collectMessages(error, messages);
    }
  }

  let meta = value.meta;
  if (isRecord(meta)) {
    collectMessages(meta, messages);
  }
};

let extractZapierMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let data = response?.data;
  let messages: string[] = [];

  if (typeof data === 'string' && data.trim()) {
    messages.push(data.trim());
  } else {
    collectMessages(data, messages);
  }

  let uniqueMessages = [...new Set(messages)];
  if (uniqueMessages.length > 0) {
    return uniqueMessages.join(' - ');
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
};

export let zapierServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let zapierApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = response?.status;
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  let serviceError = zapierServiceError(
    `Zapier API ${operation} failed: ${statusLabel}${extractZapierMessage(error)}`
  );

  serviceError.data.reason = 'zapier_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
