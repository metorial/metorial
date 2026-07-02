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

let collectMailchimpMessages = (data: unknown, messages: string[]) => {
  if (!isRecord(data)) {
    pushMessage(messages, data);
    return;
  }

  pushMessage(messages, data.title);
  pushMessage(messages, data.detail);
  pushMessage(messages, data.error);
  pushMessage(messages, data.error_description);
  pushMessage(messages, data.message);

  let validationErrors = data.errors;
  if (Array.isArray(validationErrors)) {
    for (let validationError of validationErrors) {
      if (!isRecord(validationError)) continue;

      let field =
        typeof validationError.field === 'string' ? validationError.field : undefined;
      let message =
        typeof validationError.message === 'string' ? validationError.message : undefined;

      if (field && message) {
        pushMessage(messages, `${field}: ${message}`);
      } else {
        pushMessage(messages, message);
      }
    }
  }
};

let extractMailchimpMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let messages: string[] = [];

  collectMailchimpMessages(response?.data, messages);

  if (messages.length > 0) {
    return messages.join(' - ');
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
};

export let mailchimpServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let mailchimpApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = response?.status;
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  let serviceError = mailchimpServiceError(
    `Mailchimp API ${operation} failed: ${statusLabel}${extractMailchimpMessage(error)}`
  );

  serviceError.data.reason = 'mailchimp_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
