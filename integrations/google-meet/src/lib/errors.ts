import { badRequestError, ServiceError } from '@lowerdeck/error';
import { getApiErrorResponseWithBody } from 'slates';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let addUnique = (values: string[], value: unknown) => {
  let text = typeof value === 'string' ? value.trim() : '';
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

let trimmed = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

// Google's canonical status (such as PERMISSION_DENIED) plus the first ErrorInfo
// or legacy reason and its domain, which say what the status was caused by.
let extractGoogleErrorCause = (
  error: unknown
): { code?: string; reason?: string; domain?: string } => {
  let body = getApiErrorResponseWithBody(error)?.data;
  let googleError = isRecord(body) && isRecord(body.error) ? body.error : undefined;
  if (!googleError) {
    return {};
  }

  let code = trimmed(googleError.status);
  for (let key of ['details', 'errors']) {
    let items = googleError[key];
    if (!Array.isArray(items)) continue;
    for (let item of items) {
      if (isRecord(item) && trimmed(item.reason)) {
        return { code, reason: trimmed(item.reason), domain: trimmed(item.domain) };
      }
    }
  }

  return { code };
};

export let googleMeetServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let googleMeetApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let status = getErrorStatus(error);
  let statusText = getErrorStatusText(error);
  let statusLabel =
    status !== undefined ? `HTTP ${status}${statusText ? ` ${statusText}` : ''}: ` : '';
  let serviceError = googleMeetServiceError(
    `Google Meet API ${operation} failed: ${statusLabel}${extractGoogleMessage(error)}`
  );

  serviceError.data.reason = 'google_meet_api_error';
  serviceError.data.upstreamStatus = status;
  let cause = extractGoogleErrorCause(error);
  if (cause.code) {
    serviceError.data.upstreamCode = cause.code;
  }
  if (cause.reason) {
    serviceError.data.upstreamReason = cause.reason;
  }
  if (cause.domain) {
    serviceError.data.upstreamDomain = cause.domain;
  }

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};

export let googleMeetOAuthError = (operation: string, error: unknown) => {
  if (error instanceof ServiceError) {
    return error;
  }

  let serviceError = googleMeetServiceError(
    `Google Meet OAuth ${operation} failed: ${extractGoogleMessage(error)}`
  );
  let status = getErrorStatus(error);
  serviceError.data.reason = 'google_meet_oauth_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};

// HTTP 409 is ALREADY_EXISTS or ABORTED; only a 409 without a status is ambiguous.
export let isMeetAlreadyExists = (error: unknown) =>
  error instanceof ServiceError &&
  (error.data.upstreamCode === 'ALREADY_EXISTS' ||
    (error.data.upstreamStatus === 409 && error.data.upstreamCode === undefined));
// Google's API infrastructure reports a missing scope, a disabled API or a spent
// quota as 403 with the reason domain "googleapis.com" (legacy: "usageLimits", or
// the reason "insufficientPermissions"). Those concern the whole connection and
// stay failures; any other 403 concerns the one resource.
let CONNECTION_WIDE_DOMAINS = ['googleapis.com', 'usageLimits'];
export let isMeetResourceInaccessible = (error: unknown) => {
  if (!(error instanceof ServiceError)) return false;
  const { upstreamStatus, upstreamReason, upstreamDomain } = error.data;
  if (upstreamStatus === 404) return true;
  return (
    upstreamStatus === 403 &&
    upstreamReason !== 'insufficientPermissions' &&
    !CONNECTION_WIDE_DOMAINS.includes(upstreamDomain)
  );
};
