import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let pushDetail = (details: string[], value: unknown) => {
  if (typeof value !== 'string' && typeof value !== 'number') return;

  let detail = String(value).trim();
  if (detail && !details.includes(detail)) details.push(detail);
};

let collectDetails = (value: unknown, details: string[]) => {
  if (Array.isArray(value)) {
    for (let item of value) collectDetails(item, details);
    return;
  }

  if (!isRecord(value)) {
    pushDetail(details, value);
    return;
  }

  pushDetail(details, value.reason);
  pushDetail(details, value.message);
  pushDetail(details, value.error_description);
  pushDetail(details, value.error);
  pushDetail(details, value.code);
  collectDetails(value.errors, details);
};

let extractAdobeSignMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let details: string[] = [];

  collectDetails(response?.data, details);

  if (details.length > 0) return details.join(' - ');
  if (error instanceof Error && error.message) return error.message;
  return 'Unknown error';
};

let statusLabelFor = (response?: ErrorResponse) =>
  response?.status !== undefined
    ? `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}: `
    : '';

let upstreamCodeFor = (response?: ErrorResponse) => {
  if (!isRecord(response?.data)) return undefined;

  let code = response.data.code ?? response.data.error;
  if (typeof code === 'string' || typeof code === 'number') return String(code);

  let reason = response.data.reason;
  if (typeof reason !== 'string') return undefined;
  return reason.split(':')[0]?.trim();
};

export let adobeSignServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let adobeSignApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) return error;

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let serviceError = adobeSignServiceError(
    `Adobe Acrobat Sign API ${operation} failed: ${statusLabelFor(response)}${extractAdobeSignMessage(error)}`
  );
  serviceError.data.reason = 'adobe_sign_api_error';
  serviceError.data.upstreamStatus = response?.status;
  serviceError.data.upstreamCode = upstreamCodeFor(response);

  if (error instanceof Error) serviceError.setParent(error);

  return serviceError;
};

export let adobeSignRequest = async <T>(operation: string, run: () => Promise<T>) => {
  try {
    return await run();
  } catch (error) {
    throw adobeSignApiError(error, operation);
  }
};
