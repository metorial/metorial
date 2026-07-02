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

let collectWooCommerceMessages = (value: unknown, messages: string[]) => {
  if (typeof value === 'string') {
    pushMessage(messages, value);
    return;
  }

  if (Array.isArray(value)) {
    for (let item of value) collectWooCommerceMessages(item, messages);
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  for (let key of ['message', 'code', 'error', 'error_description']) {
    pushMessage(messages, value[key]);
  }

  for (let nested of Object.values(value)) {
    if (Array.isArray(nested) || isRecord(nested)) {
      collectWooCommerceMessages(nested, messages);
    }
  }
};

let extractWooCommerceMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let data = response?.data;
  let messages: string[] = [];

  collectWooCommerceMessages(data, messages);

  if (messages.length > 0) {
    return messages.join(' - ');
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
};

export let woocommerceServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let woocommerceApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = response?.status;
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  let serviceError = woocommerceServiceError(
    `WooCommerce API ${operation} failed: ${statusLabel}${extractWooCommerceMessage(error)}`
  );

  serviceError.data.reason = 'woocommerce_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
