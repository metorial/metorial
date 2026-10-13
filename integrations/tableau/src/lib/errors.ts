import { badRequestError, ServiceError } from '@lowerdeck/error';
import { type ApiErrorResponse, buildApiServiceError } from 'slates';

let MAX_ERROR_DETAILS = 5;
let MAX_ERROR_MESSAGE_LENGTH = 1_000;
let MAX_ERROR_BODY_SCAN_LENGTH = 64 * 1024;

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let looksLikeHtml = (value: string) =>
  /^\s*<!doctype html/i.test(value) || /<\/?(html|body|head)\b/i.test(value);

let truncate = (value: string) =>
  value.length > MAX_ERROR_MESSAGE_LENGTH
    ? `${value.slice(0, MAX_ERROR_MESSAGE_LENGTH)}...`
    : value;

let pushDetail = (details: string[], value: unknown) => {
  if (details.length >= MAX_ERROR_DETAILS) return;
  if (typeof value !== 'string') return;

  let text = value.trim();
  if (!text || looksLikeHtml(text) || text === '[truncated]') return;
  if (!details.includes(text)) details.push(text);
};

let collectTableauDetails = (value: unknown, details: string[]) => {
  if (!isRecord(value)) return;

  pushDetail(details, value.summary);
  pushDetail(details, value.detail);
  pushDetail(details, value.message);
  pushDetail(details, value.errorMessage);
  pushDetail(details, value.title);

  if (typeof value.code === 'string' && value.code.trim()) {
    pushDetail(details, `code ${value.code.trim()}`);
  }

  if (isRecord(value.error)) collectTableauDetails(value.error, details);

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

// Export endpoints are requested with Accept: */*, so Tableau can answer errors
// with its XML tsResponse envelope instead of JSON.
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

/**
 * Decodes Tableau error bodies (JSON, XML, text, or binary from file exports) into a
 * structured value so the shared error baggage keeps readable details instead of
 * raw byte maps or markup.
 */
export let decodeTableauErrorBody = (data: unknown): unknown => {
  let text: string | undefined;

  if (typeof data === 'string') {
    text = data;
  } else if (data instanceof ArrayBuffer) {
    text = Buffer.from(data).toString('utf8');
  } else if (ArrayBuffer.isView(data)) {
    text = Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString('utf8');
  } else {
    return data;
  }

  let trimmed = text.trim();
  // Empty, HTML, and unrecognized markup bodies become an empty record so raw markup
  // or byte maps never end up in the stored error details.
  if (!trimmed) return {};

  if (/^[{[]/.test(trimmed)) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // Fall through to the bounded text handling below.
    }
  }

  let bounded = trimmed.slice(0, MAX_ERROR_BODY_SCAN_LENGTH);
  if (looksLikeHtml(bounded)) return {};

  if (bounded.startsWith('<')) {
    return parseTableauXmlError(bounded) ?? {};
  }

  return truncate(bounded);
};

// createAxios converts upstream failures into SlateError before this adapter runs, so
// the upstream status only survives in SlateError.data and the body in its baggage.
let withSlateErrorResponseData = (
  error: unknown,
  response: ApiErrorResponse | undefined
): ApiErrorResponse | undefined => {
  if (response?.data !== undefined) {
    return { ...response, data: decodeTableauErrorBody(response.data) };
  }
  if (!isRecord(error) || error.name !== 'SlateError' || !isRecord(error.data)) {
    return response;
  }

  let baggage = isRecord(error.data.baggage) ? error.data.baggage : undefined;
  if (baggage?.response === undefined) return response;

  return { ...response, data: decodeTableauErrorBody(baggage.response) };
};

let extractTableauMessage = (error: unknown, response: ApiErrorResponse | undefined) => {
  let details: string[] = [];
  let data = response?.data;

  if (isRecord(data)) {
    collectTableauDetails(data, details);
  } else {
    pushDetail(details, data);
  }

  if (details.length > 0) return truncate(details.join(' - '));

  let message = error instanceof Error ? error.message.trim() : '';
  if (message && !looksLikeHtml(message)) return truncate(message);
  if (response?.statusText) return response.statusText;
  return message ? 'Tableau returned an unexpected non-JSON error response.' : 'Unknown error';
};

export let tableauServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let tableauApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'Tableau',
    operation,
    reason: 'tableau_api_error',
    extractResponse: (input, helpers) =>
      withSlateErrorResponseData(input, helpers.getResponse(input)),
    extractMessage: (input, helpers) =>
      extractTableauMessage(
        input,
        withSlateErrorResponseData(input, helpers.getResponse(input))
      )
  });
