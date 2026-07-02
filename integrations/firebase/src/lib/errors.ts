import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let addUnique = (values: string[], value: unknown) => {
  let text = typeof value === 'string' ? value.trim() : undefined;
  if (text && !values.includes(text)) {
    values.push(text);
  }
};

let extractGoogleErrorMessage = (error: unknown) => {
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
  } else {
    addUnique(details, data);
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

export let firebaseServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let firebaseApiError = (operation: string, error: unknown) => {
  if (error instanceof ServiceError) {
    return error;
  }

  let status = getErrorStatus(error);
  let statusText = getErrorStatusText(error);
  let statusLabel =
    status !== undefined ? `HTTP ${status}${statusText ? ` ${statusText}` : ''}: ` : '';
  let serviceError = firebaseServiceError(
    `Firebase ${operation} failed: ${statusLabel}${extractGoogleErrorMessage(error)}`
  );

  serviceError.data.reason = 'firebase_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};

export let firebaseOAuthError = (operation: string, error: unknown) => {
  if (error instanceof ServiceError) {
    return error;
  }

  let serviceError = firebaseServiceError(
    `Google OAuth ${operation} failed: ${extractGoogleErrorMessage(error)}`
  );
  serviceError.data.reason = 'firebase_oauth_error';
  serviceError.data.upstreamStatus = getErrorStatus(error);

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};

export let withFirebaseApiError = async <T>(
  operation: string,
  run: () => Promise<T>
): Promise<T> => {
  try {
    return await run();
  } catch (error) {
    throw firebaseApiError(operation, error);
  }
};

export let missingRequiredFieldError = (field: string, operation: string) =>
  firebaseServiceError(`${field} is required for ${operation} operation`);
