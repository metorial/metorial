import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let addMessage = (messages: string[], value: unknown) => {
  if (typeof value !== 'string') return;

  let trimmed = value.trim();
  if (trimmed && !messages.includes(trimmed)) {
    messages.push(trimmed);
  }
};

let collectMessages = (value: unknown, messages: string[]) => {
  if (typeof value === 'string') {
    addMessage(messages, value);
    return;
  }

  if (Array.isArray(value)) {
    for (let item of value) {
      collectMessages(item, messages);
    }
    return;
  }

  if (!isRecord(value)) return;

  for (let key of ['detail', 'message', 'error', 'error_description', 'text']) {
    collectMessages(value[key], messages);
  }

  if (isRecord(value.fields)) {
    collectMessages(Object.values(value.fields), messages);
  }

  if (Array.isArray(value.errors)) {
    collectMessages(value.errors, messages);
  }
};

let extractDockerHubMessage = (error: unknown) => {
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

export let dockerHubServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let dockerHubApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status =
    response?.status ??
    (isRecord(error) && typeof error.status === 'number' ? error.status : undefined);
  let statusText =
    response?.statusText ??
    (isRecord(error) &&
    isRecord(error.upstream) &&
    typeof error.upstream.statusText === 'string'
      ? error.upstream.statusText
      : undefined);
  let statusLabel =
    status !== undefined ? `HTTP ${status}${statusText ? ` ${statusText}` : ''}: ` : '';

  let serviceError = dockerHubServiceError(
    `Docker Hub API ${operation} failed: ${statusLabel}${extractDockerHubMessage(error)}`
  );

  serviceError.data.reason = 'docker_hub_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
