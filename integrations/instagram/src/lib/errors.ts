import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let collectMetaErrorMessages = (value: unknown, messages: string[]) => {
  if (!isRecord(value)) return;

  let metaError = value.error;
  if (isRecord(metaError)) {
    collectMetaErrorMessages(metaError, messages);
  }

  for (let key of [
    'message',
    'error_user_msg',
    'error_user_title',
    'error_description',
    'error'
  ]) {
    let detail = value[key];
    if (typeof detail === 'string' && detail.trim()) {
      messages.push(detail.trim());
    }
  }
};

let extractInstagramMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let data = response?.data;
  let messages: string[] = [];

  if (isRecord(data)) {
    collectMetaErrorMessages(data, messages);
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

export let instagramServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let instagramApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = response?.status;
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  let serviceError = instagramServiceError(
    `Instagram API ${operation} failed: ${statusLabel}${extractInstagramMessage(error)}`
  );

  serviceError.data.reason = 'instagram_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
