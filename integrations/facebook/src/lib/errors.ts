import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let stringValue = (value: unknown) => (typeof value === 'string' ? value : undefined);

let extractFacebookMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let data = response?.data;
  let details: string[] = [];

  if (isRecord(data)) {
    let graphError = isRecord(data.error) ? data.error : undefined;
    let candidates = graphError ? graphError : data;

    for (let key of [
      'message',
      'error_user_title',
      'error_user_msg',
      'type',
      'error',
      'error_description'
    ]) {
      let value = stringValue(candidates[key]);
      if (value && !details.includes(value)) {
        details.push(value);
      }
    }

    for (let key of ['code', 'error_subcode', 'fbtrace_id']) {
      let value = candidates[key];
      if (
        (typeof value === 'string' || typeof value === 'number') &&
        !details.includes(`${key}: ${value}`)
      ) {
        details.push(`${key}: ${value}`);
      }
    }
  } else if (typeof data === 'string' && data.trim()) {
    details.push(data.trim());
  }

  if (response?.status) {
    let status = `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}`;
    return details.length > 0 ? `${status}: ${details.join(' - ')}` : status;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
};

export let facebookServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let facebookApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let serviceError = facebookServiceError(
    `Facebook Graph API ${operation} failed: ${extractFacebookMessage(error)}`
  );

  serviceError.data.reason = 'facebook_api_error';
  serviceError.data.upstreamStatus = response?.status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
