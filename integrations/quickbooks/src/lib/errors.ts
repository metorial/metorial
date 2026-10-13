import { badRequestError, ServiceError } from '@lowerdeck/error';
import { type ApiErrorResponse, buildApiServiceError } from '@slates/provider';

let MAX_ERROR_DETAILS = 5;
let MAX_ERROR_MESSAGE_LENGTH = 1_000;

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let looksLikeHtml = (value: string) =>
  /^\s*</.test(value) || /<\/?(html|body|head)\b/i.test(value);

let truncate = (value: string) =>
  value.length > MAX_ERROR_MESSAGE_LENGTH
    ? `${value.slice(0, MAX_ERROR_MESSAGE_LENGTH)}...`
    : value;

let textOf = (value: unknown) => {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  let text = String(value).trim();
  return text && text !== '[truncated]' && !looksLikeHtml(text) ? text : undefined;
};

let pushDetail = (details: string[], value: unknown) => {
  if (details.length >= MAX_ERROR_DETAILS) return;
  let text = textOf(value);
  if (text && !details.includes(text)) {
    details.push(text);
  }
};

let pick = (record: Record<string, unknown>, ...keys: string[]) => {
  for (let key of keys) {
    if (record[key] !== undefined) return record[key];
  }
  return undefined;
};

// QuickBooks errors look like { Fault: { Error: [{ Message, Detail, code, element }], type } }
// (401 responses use lowercase fault/error/message/detail keys).
let formatFaultEntry = (entry: unknown) => {
  if (!isRecord(entry)) return textOf(entry);

  let message = textOf(pick(entry, 'Message', 'message'));
  let detail = textOf(pick(entry, 'Detail', 'detail'));
  let code = textOf(pick(entry, 'code', 'Code'));
  let element = textOf(pick(entry, 'element', 'Element'));

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
  if (!isRecord(data)) return undefined;
  let fault = pick(data, 'Fault', 'fault');
  return isRecord(fault) ? fault : undefined;
};

// Flattens the nested QuickBooks Fault body so createAxios keeps the useful
// fields in SlateError baggage (it truncates values nested four levels deep).
export let flattenQuickBooksErrorResponse = (data: unknown): unknown => {
  let fault = getFault(data);
  if (!fault) return data;

  let entries = pick(fault, 'Error', 'error');
  let errors = (Array.isArray(entries) ? entries : [entries]).filter(
    entry => entry !== undefined
  );
  let details: string[] = [];
  for (let entry of errors) {
    pushDetail(details, formatFaultEntry(entry));
  }

  let firstError = errors.find(isRecord);
  let code = firstError ? textOf(pick(firstError, 'code', 'Code')) : undefined;
  let type = textOf(pick(fault, 'type', 'Type'));

  return {
    message: details.length > 0 ? truncate(details.join(' - ')) : type,
    ...(code ? { code } : {}),
    ...(type ? { type } : {})
  };
};

let extractQuickBooksDataMessage = (data: unknown) => {
  let flattened = flattenQuickBooksErrorResponse(data);
  let details: string[] = [];

  if (typeof flattened === 'string') {
    pushDetail(details, flattened);
  } else if (isRecord(flattened)) {
    pushDetail(details, flattened.message);
    if (isRecord(flattened.error)) {
      pushDetail(details, flattened.error.message);
    } else {
      pushDetail(details, flattened.error);
    }
    pushDetail(details, flattened.error_description);
    pushDetail(details, flattened.detail);
  }

  return details.length > 0 ? truncate(details.join(' - ')) : undefined;
};

// createAxios converts upstream failures into SlateError before this adapter
// runs, so the raw response body only survives in SlateError.data.baggage.
let withSlateErrorResponseData = (
  error: unknown,
  response: ApiErrorResponse | undefined
): ApiErrorResponse | undefined => {
  if (response?.data !== undefined) return response;
  if (!isRecord(error) || error.name !== 'SlateError' || !isRecord(error.data)) {
    return response;
  }

  let baggage = isRecord(error.data.baggage) ? error.data.baggage : undefined;
  if (baggage?.response === undefined) return response;

  return { ...response, data: baggage.response };
};

let fallbackMessageFor = (error: unknown, response: ApiErrorResponse | undefined) => {
  let message = error instanceof Error ? error.message.trim() : '';
  if (message && !looksLikeHtml(message)) return truncate(message);
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
    extractResponse: (input, helpers) =>
      withSlateErrorResponseData(input, helpers.getResponse(input)),
    extractMessage: (input, helpers) => {
      let response = withSlateErrorResponseData(input, helpers.getResponse(input));
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
