import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let stringValue = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

let collectIntercomMessages = (value: unknown) => {
  let messages: string[] = [];

  if (isRecord(value)) {
    for (let key of ['message', 'error_description', 'error']) {
      let message = stringValue(value[key]);
      if (message) messages.push(message);
    }

    let errors = value.errors;
    if (Array.isArray(errors)) {
      for (let item of errors) {
        if (!isRecord(item)) continue;

        let code = stringValue(item.code);
        let message = stringValue(item.message);
        if (code && message) {
          messages.push(`${code}: ${message}`);
        } else if (message) {
          messages.push(message);
        } else if (code) {
          messages.push(code);
        }
      }
    }
  } else {
    let message = stringValue(value);
    if (message) messages.push(message);
  }

  return [...new Set(messages)];
};

let extractIntercomMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let messages = collectIntercomMessages(response?.data);

  if (messages.length > 0) {
    return messages.join(' - ');
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
};

let extractIntercomCode = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let data = response?.data;

  if (!isRecord(data) || !Array.isArray(data.errors)) {
    return undefined;
  }

  let firstError = data.errors.find(isRecord);
  let code = firstError ? stringValue(firstError.code) : '';
  return code || undefined;
};

export let intercomServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let intercomApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = response?.status;
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  let serviceError = intercomServiceError(
    `Intercom API ${operation} failed: ${statusLabel}${extractIntercomMessage(error)}`
  );

  serviceError.data.reason = 'intercom_api_error';
  serviceError.data.upstreamStatus = status;
  serviceError.data.upstreamCode = extractIntercomCode(error);

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
