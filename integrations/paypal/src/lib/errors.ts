import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let pushString = (messages: string[], value: unknown) => {
  if (typeof value === 'string' && value.trim() && !messages.includes(value.trim())) {
    messages.push(value.trim());
  }
};

let collectPayPalDetails = (value: unknown, messages: string[]) => {
  if (!isRecord(value)) {
    return;
  }

  pushString(messages, value.issue);
  pushString(messages, value.description);
  pushString(messages, value.message);
};

let extractPayPalMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let data = response?.data;
  let messages: string[] = [];

  if (isRecord(data)) {
    for (let key of ['message', 'error_description', 'error', 'name', 'issue']) {
      pushString(messages, data[key]);
    }

    if (Array.isArray(data.details)) {
      for (let item of data.details) {
        collectPayPalDetails(item, messages);
      }
    }
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

let extractDebugId = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let data = response?.data;
  if (isRecord(data) && typeof data.debug_id === 'string') {
    return data.debug_id;
  }
  return undefined;
};

export let paypalServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let paypalApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = response?.status;
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  let serviceError = paypalServiceError(
    `PayPal API ${operation} failed: ${statusLabel}${extractPayPalMessage(error)}`
  );

  serviceError.data.reason = 'paypal_api_error';
  serviceError.data.upstreamStatus = status;

  let debugId = extractDebugId(error);
  if (debugId) {
    serviceError.data.debugId = debugId;
  }

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
