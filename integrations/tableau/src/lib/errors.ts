import { badRequestError, ServiceError } from '@lowerdeck/error';
import {
  type ApiErrorBuildHelpers,
  type ApiErrorResponse,
  buildApiServiceError,
  decodeApiErrorBody,
  isApiErrorRecord,
  looksLikeHtmlErrorBody,
  pushBoundedApiErrorDetail,
  readApiErrorText,
  truncateApiErrorMessage
} from 'slates';

let MAX_ERROR_BODY_SCAN_LENGTH = 64 * 1024;

// Tableau error details are text; numeric values are never shown as messages.
let pushDetail = (details: string[], value: unknown) =>
  pushBoundedApiErrorDetail(details, value, { includeNumbers: false });

let collectTableauDetails = (value: unknown, details: string[]) => {
  if (!isApiErrorRecord(value)) return;

  pushDetail(details, value.summary);
  pushDetail(details, value.detail);
  pushDetail(details, value.message);
  pushDetail(details, value.errorMessage);
  pushDetail(details, value.title);

  if (typeof value.code === 'string' && value.code.trim()) {
    pushDetail(details, `code ${value.code.trim()}`);
  }

  if (isApiErrorRecord(value.error)) collectTableauDetails(value.error, details);

  if (Array.isArray(value.errors)) {
    for (let item of value.errors) collectTableauDetails(item, details);
  }
};

let decodeXmlEntities = (value: string) =>
  value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');

// Tableau can answer errors with its XML tsResponse envelope instead of JSON,
// depending on the request's Accept header.
let parseTableauXmlError = (text: string) => {
  let errorMatch = /<error\b([^>]*)>([\s\S]*?)<\/error>/i.exec(text);
  if (!errorMatch) return undefined;

  let attributes = errorMatch[1] ?? '';
  let body = errorMatch[2] ?? '';
  let code = /\bcode\s*=\s*"([^"]*)"/i.exec(attributes)?.[1];
  let summary = /<summary>([\s\S]*?)<\/summary>/i.exec(body)?.[1];
  let detail = /<detail>([\s\S]*?)<\/detail>/i.exec(body)?.[1];

  return {
    error: {
      ...(summary ? { summary: decodeXmlEntities(summary.trim()) } : {}),
      ...(detail ? { detail: decodeXmlEntities(detail.trim()) } : {}),
      ...(code ? { code } : {})
    }
  };
};

let isTextBody = (data: unknown) =>
  typeof data === 'string' || data instanceof ArrayBuffer || ArrayBuffer.isView(data);

/**
 * Decodes Tableau error bodies (JSON, XML, or text, as strings or bytes) into a structured
 * value so the shared error baggage keeps readable details instead of raw byte maps or markup.
 */
export let decodeTableauErrorBody = (data: unknown): unknown => {
  if (!isTextBody(data)) return data;

  let decoded = decodeApiErrorBody(data);
  if (typeof decoded !== 'string') return decoded;

  // Empty and HTML bodies become an empty record so raw markup never ends up in the
  // stored error details.
  if (!decoded) return {};

  let bounded = decoded.slice(0, MAX_ERROR_BODY_SCAN_LENGTH);
  if (looksLikeHtmlErrorBody(bounded)) return {};

  if (bounded.startsWith('<')) {
    let xmlError = parseTableauXmlError(bounded);
    if (xmlError) return xmlError;
    // Other XML documents carry no readable message; plain text such as "<id> is required"
    // is kept below.
    if (/^<(\?xml|tsResponse)\b/i.test(bounded)) return {};
  }

  return truncateApiErrorMessage(bounded);
};

// createAxios converts upstream failures into SlateError before this adapter runs, so
// the body is recovered from its baggage and decoded the same way as a raw response.
let getTableauErrorResponse = (
  error: unknown,
  helpers: ApiErrorBuildHelpers
): ApiErrorResponse | undefined => {
  let response = helpers.getResponseWithBody(error);
  if (response?.data === undefined) return response;
  return { ...response, data: decodeTableauErrorBody(response.data) };
};

let extractTableauMessage = (error: unknown, response: ApiErrorResponse | undefined) => {
  let details: string[] = [];
  let data = response?.data;

  if (isApiErrorRecord(data)) {
    collectTableauDetails(data, details);
  } else {
    pushDetail(details, data);
  }

  if (details.length > 0) return truncateApiErrorMessage(details.join(' - '));

  // The intercepted error message can itself be an HTML page or a sanitized-baggage
  // placeholder; neither is shown.
  let rawMessage = error instanceof Error ? error.message.trim() : '';
  let message = readApiErrorText(rawMessage);
  if (message) return truncateApiErrorMessage(message);
  if (response?.statusText) return response.statusText;
  return rawMessage
    ? 'Tableau returned an unexpected non-JSON error response.'
    : 'Unknown error';
};

export let tableauServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let tableauApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'Tableau',
    operation,
    reason: 'tableau_api_error',
    extractResponse: getTableauErrorResponse,
    extractMessage: (input, helpers) =>
      extractTableauMessage(input, getTableauErrorResponse(input, helpers))
  });
