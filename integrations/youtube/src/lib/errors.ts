import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let stringValue = (value: unknown) => (typeof value === 'string' ? value : undefined);

let addUnique = (values: string[], value: unknown) => {
  let text = stringValue(value)?.trim();
  if (text && !values.includes(text)) {
    values.push(text);
  }
};

let extractGoogleMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let data = response?.data;
  let details: string[] = [];

  if (isRecord(data)) {
    let googleError = data.error;

    if (isRecord(googleError)) {
      addUnique(details, googleError.message);
      addUnique(details, googleError.status);

      let errors = googleError.errors;
      if (Array.isArray(errors)) {
        for (let item of errors) {
          if (isRecord(item)) {
            addUnique(details, item.reason);
            addUnique(details, item.message);
          }
        }
      }
    } else {
      addUnique(details, googleError);
    }

    addUnique(details, data.error_description);
    addUnique(details, data.message);
  } else if (typeof data === 'string' && data.trim()) {
    details.push(data.trim());
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

export let youtubeServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let youtubeApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let status = getErrorStatus(error);
  let statusText = getErrorStatusText(error);
  let statusLabel =
    status !== undefined ? `HTTP ${status}${statusText ? ` ${statusText}` : ''}: ` : '';
  let serviceError = youtubeServiceError(
    `YouTube API ${operation} failed: ${statusLabel}${extractGoogleMessage(error)}`
  );

  serviceError.data.reason = 'youtube_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};

export let youtubeOAuthError = (operation: string, error: unknown) => {
  if (error instanceof ServiceError) {
    return error;
  }

  let serviceError = youtubeServiceError(
    `YouTube OAuth ${operation} failed: ${extractGoogleMessage(error)}`
  );
  let status = getErrorStatus(error);
  serviceError.data.reason = 'youtube_oauth_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
