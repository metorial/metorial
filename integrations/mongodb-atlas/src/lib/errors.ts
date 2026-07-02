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

let collectAtlasMessage = (value: unknown, messages: string[]) => {
  if (!isRecord(value)) return;

  for (let key of ['detail', 'reason', 'errorCode', 'message', 'error_description']) {
    pushString(messages, value[key]);
  }

  let badRequestDetail = value.badRequestDetail;
  if (isRecord(badRequestDetail) && Array.isArray(badRequestDetail.fields)) {
    for (let field of badRequestDetail.fields) {
      if (!isRecord(field)) continue;
      let fieldName = typeof field.field === 'string' ? `${field.field}: ` : '';
      if (typeof field.description === 'string') {
        pushString(messages, `${fieldName}${field.description}`);
      }
    }
  }
};

let extractAtlasMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let data = response?.data;
  let messages: string[] = [];

  if (Array.isArray(data)) {
    for (let item of data) collectAtlasMessage(item, messages);
  } else if (isRecord(data)) {
    collectAtlasMessage(data, messages);
  } else {
    pushString(messages, data);
  }

  if (messages.length > 0) return messages.join(' - ');
  if (error instanceof Error && error.message) return error.message;
  return 'Unknown error';
};

export let atlasServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let atlasApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = response?.status;
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  let serviceError = atlasServiceError(
    `MongoDB Atlas API ${operation} failed: ${statusLabel}${extractAtlasMessage(error)}`
  );

  serviceError.data.reason = 'mongodb_atlas_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
