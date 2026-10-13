import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let MAX_ERROR_DETAILS = 5;
let MAX_ERROR_MESSAGE_LENGTH = 1_000;

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let stringValue = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

let looksLikeHtml = (value: string) =>
  /^\s*</.test(value) || /<\/?(html|body|head)\b/i.test(value);

let truncate = (value: string) =>
  value.length > MAX_ERROR_MESSAGE_LENGTH
    ? `${value.slice(0, MAX_ERROR_MESSAGE_LENGTH)}...`
    : value;

let nonJsonErrorMessage = (status?: number) =>
  `Salesforce returned an unexpected non-JSON error response${status ? ` (HTTP ${status})` : ''}.`;

// Salesforce REST errors are a top-level array: [{ message, errorCode, fields }].
// The shared axios error mapping only reads message/code from objects, so flatten
// the array into one bounded { message, code } record; otherwise the upstream
// explanation (e.g. "No such column ...") is replaced by a bare "Bad Request".
export let flattenSalesforceErrorResponse = (data: unknown, status?: number) => {
  if (typeof data === 'string') {
    return looksLikeHtml(data) ? { message: nonJsonErrorMessage(status) } : data;
  }

  if (!Array.isArray(data)) return data;

  let details: string[] = [];
  let codes: string[] = [];

  for (let item of data) {
    if (!isRecord(item)) continue;

    let message = stringValue(item.message);
    if (message && looksLikeHtml(message)) message = undefined;
    let code = stringValue(item.errorCode);
    if (!message && !code) continue;

    let fields = Array.isArray(item.fields)
      ? item.fields
          .filter((field): field is string => typeof field === 'string' && !!field.trim())
          .slice(0, MAX_ERROR_DETAILS)
      : [];
    let detail = [code, message].filter(Boolean).join(': ');
    if (fields.length > 0) detail += ` (fields: ${fields.join(', ')})`;

    if (code && !codes.includes(code)) codes.push(code);
    if (!details.includes(detail) && details.length < MAX_ERROR_DETAILS) {
      details.push(detail);
    }
  }

  if (details.length === 0) return data;

  return {
    message: truncate(details.join(' - ')),
    ...(codes[0] ? { code: codes[0] } : {})
  };
};

// createAxios rejects with a SlateError, so the upstream status and body live in
// SlateError.data (status / upstream.status and baggage.response), not error.response.
let getErrorResponse = (error: unknown): ErrorResponse | undefined => {
  if (!isRecord(error) && !(error instanceof Error)) return undefined;
  let record = error as Record<string, unknown>;

  if (isRecord(record.response)) {
    return record.response as ErrorResponse;
  }

  if (record.name !== 'SlateError' || !isRecord(record.data)) return undefined;

  let data = record.data;
  let upstream = isRecord(data.upstream) ? data.upstream : undefined;
  let baggage = isRecord(data.baggage) ? data.baggage : undefined;
  let status =
    typeof upstream?.status === 'number'
      ? upstream.status
      : typeof data.status === 'number'
        ? data.status
        : undefined;

  return { status, data: baggage?.response };
};

let extractSalesforceMessage = (error: unknown) => {
  let response = getErrorResponse(error);
  let data = flattenSalesforceErrorResponse(response?.data, response?.status);
  let details: string[] = [];

  if (isRecord(data)) {
    for (let key of ['error', 'error_description', 'message']) {
      let value = stringValue(data[key]);
      if (value && !looksLikeHtml(value) && !details.includes(value)) {
        details.push(value);
      }
    }
  } else if (typeof data === 'string' && data.trim()) {
    details.push(data.trim());
  }

  if (response?.status) {
    let status = `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}`;
    return details.length > 0 ? `${status}: ${truncate(details.join(' - '))}` : status;
  }

  if (error instanceof Error && error.message) {
    return looksLikeHtml(error.message) ? nonJsonErrorMessage() : truncate(error.message);
  }

  return 'Unknown error';
};

export let salesforceServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let salesforceOAuthError = (operation: string, error: unknown) => {
  if (error instanceof ServiceError) {
    return error;
  }

  let serviceError = salesforceServiceError(
    `Salesforce OAuth ${operation} failed: ${extractSalesforceMessage(error)}`
  );

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};

export let salesforceApiError = (operation: string, error: unknown) => {
  if (error instanceof ServiceError) {
    return error;
  }

  let serviceError = salesforceServiceError(
    `Salesforce API ${operation} failed: ${extractSalesforceMessage(error)}`
  );

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
