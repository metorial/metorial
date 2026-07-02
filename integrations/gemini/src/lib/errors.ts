import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let extractGeminiMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let data = response?.data;

  if (isRecord(data)) {
    let errorData = data.error;
    if (isRecord(errorData)) {
      let message = errorData.message;
      if (typeof message === 'string' && message.trim()) return message.trim();
    }

    let message = data.message;
    if (typeof message === 'string' && message.trim()) return message.trim();
  }

  if (typeof data === 'string' && data.trim()) {
    return data.trim();
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
};

let extractGeminiStatus = (error: unknown) => {
  if (!isRecord(error)) return undefined;

  let response = error.response as ErrorResponse | undefined;
  let status = response?.status ?? error.status;
  return typeof status === 'number' || typeof status === 'string' ? status : undefined;
};

export let geminiServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let geminiApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = extractGeminiStatus(error);
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';
  let serviceError = geminiServiceError(
    `Gemini API ${operation} failed: ${statusLabel}${extractGeminiMessage(error)}`
  );

  serviceError.data.reason = 'gemini_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
