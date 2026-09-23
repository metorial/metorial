import { Buffer } from 'node:buffer';
import { createApiServiceError, createAxios, pickDefined } from 'slates';
import { buildMimeMessage, hasMimeHeaderBodySeparator } from './mime';

let gmailInsertionAxios = createAxios({
  baseURL: 'https://gmail.googleapis.com/gmail/v1/'
});

export type RawMessageEncoding = 'text' | 'base64url' | 'base64';
export type InternalDateSource = 'receivedTime' | 'dateHeader';

export interface MessageContentInput {
  raw?: string;
  rawEncoding?: RawMessageEncoding;
  from?: string;
  to?: string[];
  cc?: string[];
  subject?: string;
  body?: string;
  isHtml?: boolean;
  date?: string;
}

export interface InsertedGmailMessage {
  id: string;
  threadId?: string;
  labelIds?: string[];
  sizeEstimate?: number;
  internalDate?: string;
}

let invalid = (message: string) =>
  createApiServiceError(message, { reason: 'gmail_invalid_message_content' });

let hasHeaderLine = (text: string) => /^[!-9;-~]+:/.test(text);

let rawToBase64Url = (raw: string, encoding: RawMessageEncoding) => {
  if (encoding === 'text') {
    if (!hasMimeHeaderBodySeparator(raw) || !hasHeaderLine(raw.trimStart())) {
      throw invalid(
        'raw must be a complete RFC 822 message: header lines such as From, To, and Subject, a blank line, then the body.'
      );
    }
    return Buffer.from(raw, 'utf8').toString('base64url');
  }

  let normalized = raw.replace(/\s/g, '');
  let pattern = encoding === 'base64url' ? /^[A-Za-z0-9_-]+={0,2}$/ : /^[A-Za-z0-9+/]+={0,2}$/;
  if (!normalized || !pattern.test(normalized)) {
    throw invalid(`raw is not valid ${encoding} content.`);
  }
  let bytes = Buffer.from(normalized, encoding === 'base64url' ? 'base64url' : 'base64');
  if (!hasMimeHeaderBodySeparator(bytes.toString('latin1'))) {
    throw invalid(
      'The decoded raw content is not an RFC 822 message: it needs header lines, a blank line, then the body.'
    );
  }
  return bytes.toString('base64url');
};

let headerSafe = (value: string, field: string) => {
  if (/[\r\n]/.test(value)) {
    throw invalid(`${field} must not contain line breaks.`);
  }
  return value;
};

/**
 * Returns the base64url-encoded RFC 822 message for the Gmail `raw` field, from
 * either raw content or structured fields built with the shared MIME builder.
 */
export let buildRawMessageForInsertion = (input: MessageContentInput) => {
  let structuredFields = ['from', 'to', 'cc', 'subject', 'body', 'isHtml', 'date'] as const;
  let usedStructured = structuredFields.filter(field => input[field] !== undefined);

  if (input.raw !== undefined) {
    if (usedStructured.length > 0) {
      throw invalid(
        `Provide either raw or the structured message fields, not both (also received ${usedStructured.join(', ')}).`
      );
    }
    return rawToBase64Url(input.raw, input.rawEncoding ?? 'text');
  }

  if (input.rawEncoding !== undefined) {
    throw invalid('rawEncoding is only used together with raw.');
  }
  if (
    !input.from ||
    !input.to?.length ||
    input.subject === undefined ||
    input.body === undefined
  ) {
    throw invalid(
      'Provide raw, or the structured fields from, to, subject, and body to build the message.'
    );
  }

  let date = input.date ? new Date(input.date) : new Date();
  if (Number.isNaN(date.getTime())) {
    throw invalid('date must be a valid date-time, for example 2026-01-15T09:30:00Z.');
  }

  let mime = buildMimeMessage({
    to: input.to.map(address => headerSafe(address, 'to')),
    cc: input.cc?.map(address => headerSafe(address, 'cc')),
    subject: headerSafe(input.subject, 'subject'),
    body: input.body,
    isHtml: input.isHtml
  });
  let headers = [`From: ${headerSafe(input.from, 'from')}`, `Date: ${date.toUTCString()}`];
  return Buffer.from(`${headers.join('\r\n')}\r\n${mime}`, 'utf8').toString('base64url');
};

let postMessage = async (
  path: string,
  token: string,
  body: { raw: string; labelIds?: string[]; threadId?: string },
  params: Record<string, unknown>
): Promise<InsertedGmailMessage> => {
  let response = await gmailInsertionAxios.post(path, pickDefined(body), {
    headers: { Authorization: `Bearer ${token}` },
    params: pickDefined(params)
  });
  return response.data;
};

export let importGmailMessage = (params: {
  token: string;
  userId: string;
  raw: string;
  labelIds?: string[];
  threadId?: string;
  internalDateSource?: InternalDateSource;
  neverMarkSpam?: boolean;
  processForCalendar?: boolean;
  deleted?: boolean;
}) =>
  postMessage(
    `users/${encodeURIComponent(params.userId)}/messages/import`,
    params.token,
    { raw: params.raw, labelIds: params.labelIds, threadId: params.threadId },
    {
      internalDateSource: params.internalDateSource,
      neverMarkSpam: params.neverMarkSpam,
      processForCalendar: params.processForCalendar,
      deleted: params.deleted
    }
  );

export let insertGmailMessage = (params: {
  token: string;
  userId: string;
  raw: string;
  labelIds?: string[];
  threadId?: string;
  internalDateSource?: InternalDateSource;
  deleted?: boolean;
}) =>
  postMessage(
    `users/${encodeURIComponent(params.userId)}/messages`,
    params.token,
    { raw: params.raw, labelIds: params.labelIds, threadId: params.threadId },
    {
      internalDateSource: params.internalDateSource,
      deleted: params.deleted
    }
  );
