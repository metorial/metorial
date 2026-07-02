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

let pushAtlassianErrorMessages = (messages: string[], value: unknown) => {
  if (!Array.isArray(value)) return;

  for (let error of value) {
    if (!isRecord(error)) continue;

    pushString(messages, error.message);
    if (isRecord(error.message)) {
      pushString(messages, error.message.translation);
    }
  }
};

let extractConfluenceMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let data = response?.data;
  let messages: string[] = [];

  if (isRecord(data)) {
    pushString(messages, data.message);
    pushString(messages, data.error);
    pushString(messages, data.statusText);

    if (isRecord(data.data)) {
      pushAtlassianErrorMessages(messages, data.data.errors);
    }

    pushAtlassianErrorMessages(messages, data.errors);
  } else {
    pushString(messages, data);
  }

  if (messages.length > 0) {
    return messages.join(' - ');
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
};

export let confluenceServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let confluenceApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = response?.status;
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';
  let serviceError = confluenceServiceError(
    `Confluence API ${operation} failed: ${statusLabel}${extractConfluenceMessage(error)}`
  );

  serviceError.data.reason = 'confluence_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
