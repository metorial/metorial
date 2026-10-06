import { randomUUID } from 'node:crypto';
import { createApiServiceError } from 'slates';

export type MimeFile = {
  filename: string;
  mimeType: string;
  content: string;
  disposition?: 'attachment' | 'inline';
  contentId?: string;
};
export type ComposeInput = {
  to?: string[];
  cc?: string[];
  bcc?: string[];
  subject?: string;
  body?: string;
  isHtml?: boolean;
  inReplyTo?: string;
  references?: string;
};
export type MimeInput = ComposeInput & {
  to: string[];
  subject: string;
  body: string;
  from?: string;
  threadId?: string;
  attachments?: MimeFile[];
};
export const validateHeader = (value: string, field: string) => {
  if (
    !value.isWellFormed() ||
    [...value].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)
  )
    throw createApiServiceError(
      `${field} must not contain line breaks or control characters.`
    );
};
export const validateComposeInput = (input: ComposeInput) => {
  if (input.body !== undefined && !input.body.isWellFormed())
    throw createApiServiceError('body must contain valid Unicode text.');
  for (const key of ['to', 'cc', 'bcc'] as const) {
    const values = input[key];
    if (key === 'to' && values && values.length === 0)
      throw createApiServiceError('to must contain at least one recipient.');
    for (const value of values ?? []) {
      validateHeader(value, key);
      if (!value.trim()) throw createApiServiceError(`${key} contains an empty recipient.`);
    }
  }
  for (const key of ['subject', 'inReplyTo', 'references'] as const)
    if (input[key] !== undefined) validateHeader(input[key], key);
  for (const key of ['inReplyTo', 'references'] as const) {
    const value = input[key];
    if (value !== undefined && !/^(?:<[^<>\s]+@[^<>\s]+>\s*)+$/.test(value))
      throw createApiServiceError(
        `${key} must contain RFC Message-ID values in angle brackets.`
      );
  }
};
export const encodeBase64Url = (value: string | Buffer): string =>
  Buffer.from(value).toString('base64url');
export const decodeBase64Url = (value: string): Buffer => {
  if (!/^[A-Za-z0-9_-]*={0,2}$/.test(value) || value.replace(/=+$/, '').length % 4 === 1)
    throw createApiServiceError('Gmail returned invalid encoded message data.');
  const decoded = Buffer.from(value, 'base64url');
  if (decoded.toString('base64url') !== value.replace(/=+$/, ''))
    throw createApiServiceError('Gmail returned noncanonical encoded message data.');
  return decoded;
};
const wrapBase64 = (content: string) => content.match(/.{1,76}/g)?.join('\r\n') ?? '';
export const encodeSubject = (subject: string) => {
  validateHeader(subject, 'subject');
  if (/^[\x20-\x7e]*$/.test(subject) && Buffer.byteLength(subject) <= 70) return subject;
  const words: string[] = [];
  let chunk = '';
  for (const char of subject) {
    if (Buffer.byteLength(chunk + char) > 42) {
      words.push(`=?UTF-8?B?${Buffer.from(chunk).toString('base64')}?=`);
      chunk = '';
    }
    chunk += char;
  }
  if (chunk) words.push(`=?UTF-8?B?${Buffer.from(chunk).toString('base64')}?=`);
  return words.join('\r\n ');
};
const quoted = (value: string) => value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
export const buildMimeMessage = (params: MimeInput): string => {
  validateComposeInput(params);
  if (!params.to.length) throw createApiServiceError('Provide at least one recipient.');
  if (params.from) validateHeader(params.from, 'from');
  const boundary = `mail_${randomUUID()}`;
  const lines = [
    ...(params.from ? [`From: ${params.from}`] : []),
    `To: ${params.to.join(', ')}`,
    ...(params.cc?.length ? [`Cc: ${params.cc.join(', ')}`] : []),
    ...(params.bcc?.length ? [`Bcc: ${params.bcc.join(', ')}`] : []),
    `Subject: ${encodeSubject(params.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${randomUUID()}@reply.invalid>`,
    ...(params.inReplyTo ? [`In-Reply-To: ${params.inReplyTo}`] : []),
    ...(params.references ? [`References: ${params.references}`] : []),
    'MIME-Version: 1.0'
  ];
  const files = params.attachments ?? [];
  if (files.length)
    lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`, '', `--${boundary}`);
  lines.push(
    `Content-Type: text/${params.isHtml ? 'html' : 'plain'}; charset="UTF-8"`,
    'Content-Transfer-Encoding: base64',
    '',
    wrapBase64(Buffer.from(params.body).toString('base64'))
  );
  for (const file of files) {
    validateHeader(file.filename, 'filename');
    validateHeader(file.mimeType, 'mimeType');
    if (!/^[\w!#$&^.+-]+\/[\w!#$&^.+-]+$/.test(file.mimeType))
      throw createApiServiceError('An existing file has an unsupported MIME type.');
    if (file.contentId) validateHeader(file.contentId, 'contentId');
    lines.push(
      `--${boundary}`,
      `Content-Type: ${file.mimeType}`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: ${file.disposition ?? 'attachment'}; filename*=UTF-8''${encodeURIComponent(file.filename).replace(/['()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)}; filename="${quoted(file.filename.replace(/[^\x20-\x7e]/g, '_'))}"`,
      ...(file.contentId ? [`Content-ID: ${file.contentId}`] : []),
      '',
      wrapBase64(file.content)
    );
  }
  if (files.length) lines.push(`--${boundary}--`);
  return lines.join('\r\n');
};

// Preserve original MIME body bytes, including non-UTF-8 bodies, on header-only edits.
export const replaceRawHeaders = (
  raw: string,
  replacements: Record<string, string | undefined>
): Buffer => {
  const bytes = decodeBase64Url(raw);
  let offset = bytes.indexOf('\r\n\r\n');
  let separator = 4;
  if (offset < 0) {
    offset = bytes.indexOf('\n\n');
    separator = 2;
  }
  if (offset < 0)
    throw createApiServiceError('The existing draft has no valid MIME header boundary.');
  const blocks = bytes
    .subarray(0, offset)
    .toString('latin1')
    .split(/\r?\n(?![ \t])/);
  const retained: Buffer[] = [];
  for (const block of blocks) {
    const name = block.slice(0, block.indexOf(':')).toLowerCase();
    if (!Object.hasOwn(replacements, name)) retained.push(Buffer.from(block, 'latin1'));
  }
  for (const [name, value] of Object.entries(replacements)) {
    if (!/^[a-z-]+$/.test(name)) throw createApiServiceError('Unsupported draft header name.');
    if (value === undefined) continue;
    validateHeader(value, name);
    retained.push(
      Buffer.from(`${name}: ${name === 'subject' ? encodeSubject(value) : value}`)
    );
  }
  return Buffer.concat([
    ...retained.flatMap((block, index) => (index ? [Buffer.from('\r\n'), block] : [block])),
    Buffer.from('\r\n\r\n'),
    bytes.subarray(offset + separator)
  ]);
};
