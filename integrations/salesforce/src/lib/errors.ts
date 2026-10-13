import { badRequestError, ServiceError } from '@lowerdeck/error';
import {
  API_ERROR_MAX_DETAILS,
  getApiErrorResponseWithBody,
  isApiErrorRecord,
  looksLikeHtmlErrorBody,
  pushBoundedApiErrorDetail,
  readApiErrorText,
  truncateApiErrorMessage
} from 'slates';

let nonJsonErrorMessage = (status?: number | string) =>
  `Salesforce returned an unexpected non-JSON error response${status ? ` (HTTP ${status})` : ''}.`;

// Salesforce REST errors are a top-level array: [{ message, errorCode, fields }].
// The shared axios error mapping only reads message/code from objects, so flatten
// the array into one bounded { message, code } record; otherwise the upstream
// explanation (e.g. "No such column ...") is replaced by a bare "Bad Request".
export let flattenSalesforceErrorResponse = (data: unknown, status?: number | string) => {
  if (typeof data === 'string') {
    return looksLikeHtmlErrorBody(data) ? { message: nonJsonErrorMessage(status) } : data;
  }

  if (!Array.isArray(data)) return data;

  let details: string[] = [];
  let codes: string[] = [];

  for (let item of data) {
    if (!isApiErrorRecord(item)) continue;

    let message = readApiErrorText(item.message, { includeNumbers: false });
    let code = readApiErrorText(item.errorCode, { includeNumbers: false });
    if (!message && !code) continue;

    let fields = Array.isArray(item.fields)
      ? item.fields
          .filter((field): field is string => typeof field === 'string' && !!field.trim())
          .slice(0, API_ERROR_MAX_DETAILS)
      : [];
    let detail = [code, message].filter(Boolean).join(': ');
    if (fields.length > 0) detail += ` (fields: ${fields.join(', ')})`;

    if (code && !codes.includes(code)) codes.push(code);
    pushBoundedApiErrorDetail(details, detail);
  }

  if (details.length === 0) return data;

  return {
    message: truncateApiErrorMessage(details.join(' - ')),
    ...(codes[0] ? { code: codes[0] } : {})
  };
};

let extractSalesforceMessage = (error: unknown) => {
  // createAxios rejects with a SlateError, so the upstream status and body live in
  // SlateError.data (status / upstream.status and baggage.response).
  let response = getApiErrorResponseWithBody(error);
  let data = flattenSalesforceErrorResponse(response?.data, response?.status);
  let details: string[] = [];

  if (isApiErrorRecord(data)) {
    for (let key of ['error', 'error_description', 'message']) {
      pushBoundedApiErrorDetail(details, data[key], { includeNumbers: false });
    }
  } else if (typeof data === 'string' && data.trim()) {
    details.push(data.trim());
  }

  if (response?.status) {
    let status = `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}`;
    return details.length > 0
      ? `${status}: ${truncateApiErrorMessage(details.join(' - '))}`
      : status;
  }

  if (error instanceof Error && error.message) {
    return looksLikeHtmlErrorBody(error.message)
      ? nonJsonErrorMessage()
      : truncateApiErrorMessage(error.message);
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
