import { badRequestError, createError, isServiceError, ServiceError } from '@lowerdeck/error';

let addMessage = (messages: string[], value: unknown) => {
  if (typeof value === 'string' && value.trim() && !messages.includes(value.trim())) {
    messages.push(value.trim());
  }
};

let collectMessages = (value: unknown, messages: string[], seen = new WeakSet<object>()) => {
  if (value === null || value === undefined) return;

  if (typeof value === 'string') {
    addMessage(messages, value);
    return;
  }

  if (typeof value !== 'object') return;
  if (seen.has(value)) return;
  seen.add(value);

  if (Array.isArray(value)) {
    for (let item of value) collectMessages(item, messages, seen);
    return;
  }

  let record = value as Record<string, unknown>;
  addMessage(messages, record.description);
  addMessage(messages, record.message);
  addMessage(messages, record.error_description);
  addMessage(messages, record.code);
  collectMessages(record.details, messages, seen);
  collectMessages(record.errors, messages, seen);
  collectMessages(record.error, messages, seen);
};

let extractErrorMessage = (error: unknown) => {
  let messages: string[] = [];
  let responseData = (error as any)?.response?.data;

  collectMessages(responseData, messages);
  collectMessages(error, messages);

  return messages.length > 0 ? messages.join(' - ') : 'Unknown error';
};

let extractStatus = (error: unknown) => {
  let status = (error as any)?.response?.status;
  return typeof status === 'number' && Number.isFinite(status) ? status : 500;
};

let extractCode = (error: unknown) => {
  let code = (error as any)?.response?.data?.code;
  return typeof code === 'string' && code.trim()
    ? code.trim().toLowerCase()
    : 'typeform_api_error';
};

export let typeformServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let typeformApiError = (action: string, error: unknown) => {
  if (isServiceError(error)) return error;

  let status = extractStatus(error);
  let details = extractErrorMessage(error);
  let message = `Typeform API request failed while ${action}: ${details}`;

  return new ServiceError(
    createError({
      status,
      code: extractCode(error),
      message
    })
  );
};
