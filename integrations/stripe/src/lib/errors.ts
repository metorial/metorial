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

let extractStripeMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let data = response?.data;
  let messages: string[] = [];

  if (isRecord(data)) {
    let stripeError = data.error;
    if (isRecord(stripeError)) {
      pushMessage(messages, stripeError.message);
      pushMessage(messages, stripeError.type);
      pushMessage(messages, stripeError.code);
      pushMessage(messages, stripeError.decline_code);
    }

    pushMessage(messages, data.error_description);
    pushMessage(messages, data.error);
    pushMessage(messages, data.message);
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

export let stripeServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let stripeApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = response?.status;
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  let serviceError = stripeServiceError(
    `Stripe API ${operation} failed: ${statusLabel}${extractStripeMessage(error)}`
  );

  serviceError.data.reason = 'stripe_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
