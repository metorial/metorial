import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let MAX_ERROR_DETAILS = 5;
let MAX_ERROR_MESSAGE_LENGTH = 1_000;

let looksLikeHtml = (value: string) =>
  /^\s*</.test(value) || /<\/?(html|body|head)\b/i.test(value);

let addMessage = (messages: string[], value: unknown) => {
  if (typeof value !== 'string' || messages.length >= MAX_ERROR_DETAILS) return;

  let trimmed = value.trim();
  if (trimmed && !looksLikeHtml(trimmed) && !messages.includes(trimmed)) {
    messages.push(trimmed);
  }
};

let collectMessages = (value: unknown, messages: string[]) => {
  if (!isRecord(value)) {
    addMessage(messages, value);
    return;
  }

  for (let key of ['message', 'error', 'detail', 'description', 'title']) {
    addMessage(messages, value[key]);
  }

  if (Array.isArray(value.errors)) {
    for (let item of value.errors) {
      collectMessages(item, messages);
    }
  }
};

let extractMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let messages: string[] = [];

  collectMessages(response?.data, messages);

  if (isRecord(error) && isRecord(error.data)) {
    // createAxios rejects with a SlateError that keeps the upstream body
    // (for example SDMX { errors: [{ code, message }] }) in data.baggage.response.
    let baggage = isRecord(error.data.baggage) ? error.data.baggage : undefined;
    collectMessages(baggage?.response, messages);
    collectMessages(error.data, messages);
  } else if (isRecord(error)) {
    collectMessages(error.data, messages);
  }

  if (messages.length > 0) {
    let message = messages.join(' - ');
    return message.length > MAX_ERROR_MESSAGE_LENGTH
      ? `${message.slice(0, MAX_ERROR_MESSAGE_LENGTH)}...`
      : message;
  }

  if (error instanceof Error && error.message) {
    let message = error.message.trim();
    if (looksLikeHtml(message)) {
      let response = (error as Error & { response?: unknown }).response;
      let statusText = isRecord(response) ? response.statusText : undefined;
      return typeof statusText === 'string' && statusText
        ? statusText
        : 'upstream returned an HTML error page';
    }

    return message.length > MAX_ERROR_MESSAGE_LENGTH
      ? `${message.slice(0, MAX_ERROR_MESSAGE_LENGTH)}...`
      : message;
  }

  return 'Unknown error';
};

export let norgesBankServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let norgesBankApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status =
    response?.status ??
    (isRecord(error) && typeof error.status === 'number' ? error.status : undefined);
  let statusText = response?.statusText;
  let statusLabel =
    status !== undefined ? `HTTP ${status}${statusText ? ` ${statusText}` : ''}: ` : '';

  let serviceError = norgesBankServiceError(
    `Norges Bank API ${operation} failed: ${statusLabel}${extractMessage(error)}`
  );

  serviceError.data.reason = 'norges_bank_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
