import { Buffer } from 'node:buffer';
import { createApiServiceError } from 'slates';
import { buildMimeMessage, encodeMimeMessage, hasMimeHeaderBodySeparator } from './mime';

export type RawMessageEncoding = 'text' | 'base64';

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
  inReplyTo?: string;
  references?: string;
}

let invalid = (message: string) =>
  createApiServiceError(message, { reason: 'gmail_invalid_message_content' });

// The message must start with a header field (RFC 5322 field name, then a colon):
// leading whitespace or blank lines would leave Gmail an empty header block.
let startsWithHeaderLine = (text: string) => /^[!-9;-~]+:/.test(text);

let isRfc822Message = (text: string) =>
  startsWithHeaderLine(text) && hasMimeHeaderBodySeparator(text);

// Standard or URL-safe base64 alphabet, with or without trailing padding.
let base64Pattern = /^[A-Za-z0-9+/_-]+={0,2}$/;

let rawToBase64Url = (raw: string, encoding: RawMessageEncoding) => {
  if (encoding === 'text') {
    if (!isRfc822Message(raw)) {
      throw invalid(
        'raw must be a complete RFC 822 message starting with its first header line (no leading blank lines or spaces): header lines such as From, To, and Subject, a blank line, then the body.'
      );
    }
    return Buffer.from(raw, 'utf8').toString('base64url');
  }

  let normalized = raw.replace(/\s/g, '');
  if (
    !normalized ||
    !base64Pattern.test(normalized) ||
    normalized.replace(/=+$/, '').length % 4 === 1
  ) {
    throw invalid('raw is not valid base64 content.');
  }
  // Buffer base64 decoding accepts both the standard and URL-safe alphabets.
  let bytes = Buffer.from(normalized, 'base64');
  if (!isRfc822Message(bytes.toString('latin1'))) {
    throw invalid(
      'The decoded raw content is not an RFC 822 message: it must start with header lines, then a blank line, then the body.'
    );
  }
  return bytes.toString('base64url');
};

let headerSafe = <T extends string | undefined>(value: T, field: string): T => {
  if (value !== undefined && /[\r\n]/.test(value)) {
    throw invalid(`${field} must not contain line breaks.`);
  }
  return value;
};

let structuredFields = [
  'from',
  'to',
  'cc',
  'subject',
  'body',
  'isHtml',
  'date',
  'inReplyTo',
  'references'
] as const;

/**
 * Returns the base64url-encoded RFC 822 message for the Gmail `raw` field, from
 * either raw content or structured fields built with the shared MIME builder.
 */
export let buildRawMessageForInsertion = (input: MessageContentInput) => {
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
    isHtml: input.isHtml,
    inReplyTo: headerSafe(input.inReplyTo, 'inReplyTo'),
    references: headerSafe(input.references, 'references')
  });
  let headers = [`From: ${headerSafe(input.from, 'from')}`, `Date: ${date.toUTCString()}`];
  return encodeMimeMessage(`${headers.join('\r\n')}\r\n${mime}`);
};
