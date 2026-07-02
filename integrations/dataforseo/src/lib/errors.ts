import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let pushMessage = (messages: string[], value: unknown) => {
  if (typeof value !== 'string') return;

  let message = value.trim();
  if (message && !messages.includes(message)) {
    messages.push(message);
  }
};

let extractDataForSEOMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let data = response?.data;
  let messages: string[] = [];

  if (isRecord(data)) {
    pushMessage(messages, data.status_message);
    pushMessage(messages, data.message);
    pushMessage(messages, data.error);

    let tasks = data.tasks;
    if (Array.isArray(tasks)) {
      for (let task of tasks) {
        if (!isRecord(task)) continue;
        pushMessage(messages, task.status_message);
      }
    }
  } else {
    pushMessage(messages, data);
  }

  if (messages.length > 0) {
    return messages.join(' - ');
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
};

export let dataForSEOServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let dataForSEOApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = response?.status;
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  let serviceError = dataForSEOServiceError(
    `DataForSEO API ${operation} failed: ${statusLabel}${extractDataForSEOMessage(error)}`
  );

  serviceError.data.reason = 'dataforseo_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
