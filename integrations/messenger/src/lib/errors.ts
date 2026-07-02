import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let addText = (values: string[], value: unknown) => {
  if (typeof value !== 'string') {
    return;
  }

  let text = value.trim();
  if (text && !values.includes(text)) {
    values.push(text);
  }
};

let extractMessengerMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let data = response?.data;
  let details: string[] = [];

  if (isRecord(data)) {
    let graphError = data.error;

    if (isRecord(graphError)) {
      addText(details, graphError.message);
      addText(details, graphError.type);

      let code = graphError.code;
      if (typeof code === 'number' || typeof code === 'string') {
        addText(details, `code ${code}`);
      }

      let subcode = graphError.error_subcode;
      if (typeof subcode === 'number' || typeof subcode === 'string') {
        addText(details, `subcode ${subcode}`);
      }
    } else {
      addText(details, graphError);
    }

    addText(details, data.error_description);
    addText(details, data.message);
  } else if (typeof data === 'string') {
    addText(details, data);
  }

  if (details.length > 0) {
    return details.join(' - ');
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
};

let getErrorStatus = (error: unknown) => {
  if (!isRecord(error)) {
    return undefined;
  }

  let response = error.response as ErrorResponse | undefined;
  return response?.status ?? error.status;
};

let getErrorStatusText = (error: unknown) => {
  if (!isRecord(error)) {
    return undefined;
  }

  let response = error.response as ErrorResponse | undefined;
  return response?.statusText;
};

export let messengerServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let messengerApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let status = getErrorStatus(error);
  let statusText = getErrorStatusText(error);
  let statusLabel =
    status !== undefined ? `HTTP ${status}${statusText ? ` ${statusText}` : ''}: ` : '';

  let serviceError = messengerServiceError(
    `Messenger API ${operation} failed: ${statusLabel}${extractMessengerMessage(error)}`
  );

  serviceError.data.reason = 'messenger_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};

export let messengerOAuthError = (operation: string, error: unknown) => {
  if (error instanceof ServiceError) {
    return error;
  }

  let status = getErrorStatus(error);
  let serviceError = messengerServiceError(
    `Messenger OAuth ${operation} failed: ${extractMessengerMessage(error)}`
  );

  serviceError.data.reason = 'messenger_oauth_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
