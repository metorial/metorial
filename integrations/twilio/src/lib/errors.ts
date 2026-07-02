import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let pushMessage = (messages: string[], value: unknown) => {
  if (value === undefined || value === null) return;

  let message = String(value).trim();
  if (message && !messages.includes(message)) {
    messages.push(message);
  }
};

let extractTwilioMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let data = response?.data;
  let messages: string[] = [];

  if (isRecord(data)) {
    pushMessage(messages, data.message);
    pushMessage(messages, data.error_message);
    pushMessage(messages, data.error);
    pushMessage(messages, data.code);
    pushMessage(messages, data.more_info);
    pushMessage(messages, data.status);
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

let extractTwilioCode = (error: unknown) => {
  let data = isRecord(error)
    ? ((error.response as ErrorResponse | undefined)?.data as unknown)
    : undefined;
  if (!isRecord(data)) return undefined;

  let code = data.code;
  if (code === undefined || code === null) return undefined;

  return String(code);
};

export let twilioServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let twilioApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = response?.status;
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  let serviceError = twilioServiceError(
    `Twilio API ${operation} failed: ${statusLabel}${extractTwilioMessage(error)}`
  );

  serviceError.data.reason = 'twilio_api_error';
  serviceError.data.upstreamStatus = status;
  serviceError.data.upstreamCode = extractTwilioCode(error);

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
