import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let collectDiscordErrorMessages = (value: unknown, messages: string[]) => {
  if (!isRecord(value)) {
    return;
  }

  let nestedErrors = value.errors;
  if (isRecord(nestedErrors)) {
    collectDiscordErrorMessages(nestedErrors, messages);
  }

  let errorMessages = value._errors;
  if (Array.isArray(errorMessages)) {
    for (let item of errorMessages) {
      if (isRecord(item) && typeof item.message === 'string' && item.message.trim()) {
        messages.push(item.message.trim());
      }
    }
  }

  for (let nested of Object.values(value)) {
    if (isRecord(nested)) {
      collectDiscordErrorMessages(nested, messages);
    }
  }
};

let extractDiscordMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let data = response?.data;
  let messages: string[] = [];

  if (isRecord(data)) {
    for (let key of ['message', 'error_description', 'error']) {
      let value = data[key];
      if (typeof value === 'string' && value.trim()) {
        messages.push(value.trim());
      }
    }

    collectDiscordErrorMessages(data, messages);
  } else if (typeof data === 'string' && data.trim()) {
    messages.push(data.trim());
  }

  let uniqueMessages = [...new Set(messages)];
  if (uniqueMessages.length > 0) {
    return uniqueMessages.join(' - ');
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
};

export let discordServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let discordApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = response?.status;
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  let serviceError = discordServiceError(
    `Discord API ${operation} failed: ${statusLabel}${extractDiscordMessage(error)}`
  );

  serviceError.data.reason = 'discord_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
