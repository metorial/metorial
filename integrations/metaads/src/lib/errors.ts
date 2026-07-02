import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let stringValue = (value: unknown) =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;

let extractMetaMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let data = response?.data;
  let details: string[] = [];

  if (isRecord(data)) {
    let graphError = isRecord(data.error) ? data.error : data;

    for (let key of [
      'message',
      'error_user_title',
      'error_user_msg',
      'type',
      'error',
      'error_description'
    ]) {
      let value = stringValue(graphError[key]);
      if (value && !details.includes(value)) {
        details.push(value);
      }
    }

    for (let key of ['code', 'error_subcode', 'fbtrace_id']) {
      let value = stringValue(graphError[key]);
      if (value && !details.includes(`${key}: ${value}`)) {
        details.push(`${key}: ${value}`);
      }
    }
  } else if (typeof data === 'string' && data.trim()) {
    details.push(data.trim());
  }

  if (response?.status !== undefined) {
    let status = `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}`;
    return details.length > 0 ? `${status}: ${details.join(' - ')}` : status;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
};

let upstreamCodeFor = (error: unknown, key: 'code' | 'error_subcode') => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let data = isRecord(response?.data) ? response.data : undefined;
  let graphError = isRecord(data?.error) ? data.error : data;
  let value = graphError ? graphError[key] : undefined;
  return typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;
};

export let metaAdsServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let metaAdsApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let serviceError = metaAdsServiceError(
    `Meta Marketing API ${operation} failed: ${extractMetaMessage(error)}`
  );

  serviceError.data.reason = 'meta_ads_api_error';
  serviceError.data.upstreamStatus = response?.status;
  serviceError.data.upstreamCode = upstreamCodeFor(error, 'code');
  serviceError.data.upstreamSubcode = upstreamCodeFor(error, 'error_subcode');

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
