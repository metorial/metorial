import { badRequestError, ServiceError } from '@lowerdeck/error';
import {
  type ApiErrorResponse,
  buildApiServiceError,
  isApiErrorRecord,
  looksLikeHtmlErrorBody,
  pushBoundedApiErrorDetail,
  readApiErrorText,
  truncateApiErrorMessage
} from '@slates/provider';

let pick = (record: Record<string, unknown>, ...keys: string[]) => {
  for (let key of keys) {
    if (record[key] !== undefined) return record[key];
  }
  return undefined;
};

// QuickBooks errors look like { Fault: { Error: [{ Message, Detail, code, element }], type } }
// (401 responses use lowercase fault/error/message/detail keys).
let formatFaultEntry = (entry: unknown) => {
  if (!isApiErrorRecord(entry)) return readApiErrorText(entry);

  let message = readApiErrorText(pick(entry, 'Message', 'message'));
  let detail = readApiErrorText(pick(entry, 'Detail', 'detail'));
  let code = readApiErrorText(pick(entry, 'code', 'Code'));
  let element = readApiErrorText(pick(entry, 'element', 'Element'));

  let text =
    message && detail
      ? detail.toLowerCase().includes(message.toLowerCase())
        ? detail
        : `${message}: ${detail}`
      : (detail ?? message);
  if (!text) return undefined;

  let suffix = [code ? `code ${code}` : undefined, element ? `element ${element}` : undefined]
    .filter(Boolean)
    .join(', ');
  return suffix ? `${text} (${suffix})` : text;
};

let getFault = (data: unknown) => {
  if (!isApiErrorRecord(data)) return undefined;
  let fault = pick(data, 'Fault', 'fault');
  return isApiErrorRecord(fault) ? fault : undefined;
};

// Flattens the nested QuickBooks Fault body so createAxios reads its message and
// code (the shared mapping does not look inside Fault) and keeps them in baggage.
export let flattenQuickBooksErrorResponse = (data: unknown): unknown => {
  let fault = getFault(data);
  if (!fault) return data;

  let entries = pick(fault, 'Error', 'error');
  let errors = (Array.isArray(entries) ? entries : [entries]).filter(
    entry => entry !== undefined
  );
  let details: string[] = [];
  for (let entry of errors) {
    pushBoundedApiErrorDetail(details, formatFaultEntry(entry));
  }

  let firstError = errors.find(isApiErrorRecord);
  let code = firstError ? readApiErrorText(pick(firstError, 'code', 'Code')) : undefined;
  let type = readApiErrorText(pick(fault, 'type', 'Type'));

  return {
    message: details.length > 0 ? truncateApiErrorMessage(details.join(' - ')) : type,
    ...(code ? { code } : {}),
    ...(type ? { type } : {})
  };
};

let extractQuickBooksDataMessage = (data: unknown) => {
  let flattened = flattenQuickBooksErrorResponse(data);
  let details: string[] = [];

  if (typeof flattened === 'string') {
    pushBoundedApiErrorDetail(details, flattened);
  } else if (isApiErrorRecord(flattened)) {
    pushBoundedApiErrorDetail(details, flattened.message);
    if (isApiErrorRecord(flattened.error)) {
      pushBoundedApiErrorDetail(details, flattened.error.message);
    } else {
      pushBoundedApiErrorDetail(details, flattened.error);
    }
    pushBoundedApiErrorDetail(details, flattened.error_description);
    pushBoundedApiErrorDetail(details, flattened.detail);
  }

  return details.length > 0 ? truncateApiErrorMessage(details.join(' - ')) : undefined;
};

let fallbackMessageFor = (error: unknown, response: ApiErrorResponse | undefined) => {
  let message = error instanceof Error ? error.message.trim() : '';
  if (message && !looksLikeHtmlErrorBody(message)) return truncateApiErrorMessage(message);
  if (response?.statusText) return response.statusText;
  return message
    ? 'QuickBooks returned an unexpected non-JSON error response.'
    : 'Unknown error';
};

let reconnectHint = (operation: string, status: unknown) =>
  operation === 'request' && status === 401
    ? ' (the QuickBooks authorization is invalid or expired; reconnect the QuickBooks account)'
    : '';

export let quickBooksServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let quickBooksApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'QuickBooks',
    operation,
    reason: 'quickbooks_api_error',
    // createAxios converts upstream failures into SlateError before this adapter
    // runs, so the raw response body only survives in SlateError baggage.
    extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
    extractMessage: (input, helpers) => {
      let response = helpers.getResponseWithBody(input);
      return (
        extractQuickBooksDataMessage(response?.data) ?? fallbackMessageFor(input, response)
      );
    },
    formatMessage: ({
      providerLabel,
      operation: requestOperation,
      statusLabel,
      message,
      status
    }) =>
      `${providerLabel} API ${requestOperation} failed: ${statusLabel}${message}${reconnectHint(requestOperation, status)}`
  });
