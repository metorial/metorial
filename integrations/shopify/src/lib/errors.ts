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

let collectShopifyMessages = (value: unknown, messages: string[]) => {
  if (typeof value === 'string') {
    pushString(messages, value);
    return;
  }

  if (Array.isArray(value)) {
    for (let item of value) collectShopifyMessages(item, messages);
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  for (let [key, nested] of Object.entries(value)) {
    if (typeof nested === 'string') {
      pushString(messages, `${key}: ${nested}`);
    } else if (Array.isArray(nested)) {
      for (let item of nested) {
        pushString(messages, `${key}: ${String(item)}`);
      }
    } else {
      collectShopifyMessages(nested, messages);
    }
  }
};

let extractShopifyMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let data = response?.data;
  let messages: string[] = [];

  if (isRecord(data)) {
    for (let key of ['errors', 'error_description', 'error', 'message']) {
      collectShopifyMessages(data[key], messages);
    }
  } else {
    collectShopifyMessages(data, messages);
  }

  if (messages.length > 0) {
    return messages.join(' - ');
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
};

export let shopifyServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let shopifyApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = response?.status;
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  let serviceError = shopifyServiceError(
    `Shopify API ${operation} failed: ${statusLabel}${extractShopifyMessage(error)}`
  );

  serviceError.data.reason = 'shopify_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
