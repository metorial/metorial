import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let pushMessage = (messages: string[], value: unknown) => {
  if (typeof value !== 'string' && typeof value !== 'number') return;

  let message = String(value).trim();
  if (message && !messages.includes(message)) {
    messages.push(message);
  }
};

let collectMessages = (value: unknown, messages: string[]) => {
  if (Array.isArray(value)) {
    for (let item of value) {
      collectMessages(item, messages);
    }
    return;
  }

  if (!isRecord(value)) {
    pushMessage(messages, value);
    return;
  }

  pushMessage(messages, value.error);
  pushMessage(messages, value.message);
  pushMessage(messages, value.error_code);
  pushMessage(messages, value.code);
  pushMessage(messages, value.detail);
  collectMessages(value.errors, messages);
};

let extractMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let messages: string[] = [];

  collectMessages(response?.data, messages);

  if (isRecord(error)) {
    collectMessages(error.data, messages);
  }

  if (messages.length > 0) {
    return messages.join(' - ');
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
};

let getStatus = (error: unknown) => {
  if (!isRecord(error)) return undefined;

  let response = error.response as ErrorResponse | undefined;
  if (typeof response?.status === 'number') return response.status;
  if (typeof error.status === 'number') return error.status;

  if (isRecord(error.data) && typeof error.data.status_code === 'number') {
    return error.data.status_code;
  }

  return undefined;
};

let getUpstreamCode = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  if (isRecord(response?.data) && typeof response.data.error_code === 'string') {
    return response.data.error_code;
  }
  if (isRecord(response?.data) && typeof response.data.error === 'string') {
    return response.data.error;
  }
  return undefined;
};

export let docsumoServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let docsumoApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) return error;

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = getStatus(error);
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  let serviceError = docsumoServiceError(
    `Docsumo API ${operation} failed: ${statusLabel}${extractMessage(error)}`
  );
  serviceError.data.reason = 'docsumo_api_error';
  serviceError.data.upstreamStatus = status;
  serviceError.data.upstreamCode = getUpstreamCode(error);

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
