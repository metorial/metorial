import { Buffer } from 'node:buffer';

// Every non-ASCII UTF-16 code unit encodes to more than one UTF-8 byte.
let isAscii = (value: string) => Buffer.byteLength(value, 'utf8') === value.length;

// RFC 2047 limits header lines holding encoded-words to 76 characters. `=?UTF-8?B?`
// + `?=` is 12 characters. A continuation line (leading space) leaves 63 base64
// characters (45 bytes); the first line also carries the `Subject: ` name, leaving
// 55 characters (39 bytes). Both are rounded down to whole 3-byte chunks.
const maxFirstEncodedWordBytes = 39;
const maxEncodedWordBytes = 45;

/**
 * Encodes a non-ASCII header value as RFC 2047 `B` encoded-words, folded onto
 * continuation lines. ASCII values are returned unchanged.
 */
export let encodeMimeHeaderValue = (value: string): string => {
  if (isAscii(value)) {
    return value;
  }

  let words: string[] = [];
  let chunk = '';
  let chunkBytes = 0;
  for (let character of value) {
    let characterBytes = Buffer.byteLength(character, 'utf8');
    let limit = words.length === 0 ? maxFirstEncodedWordBytes : maxEncodedWordBytes;
    if (chunk && chunkBytes + characterBytes > limit) {
      words.push(chunk);
      chunk = '';
      chunkBytes = 0;
    }
    chunk += character;
    chunkBytes += characterBytes;
  }
  if (chunk) {
    words.push(chunk);
  }

  return words
    .map(word => `=?UTF-8?B?${Buffer.from(word, 'utf8').toString('base64')}?=`)
    .join('\r\n ');
};

/**
 * Returns the body lines for a text part. ASCII bodies are kept as-is (7bit);
 * non-ASCII bodies are UTF-8 encoded as base64 with 76-character lines so the
 * part is transported intact.
 */
let buildTextPartBody = (body: string): { transferEncoding?: string; lines: string[] } => {
  if (isAscii(body)) {
    return { lines: [body] };
  }

  let encoded = Buffer.from(body, 'utf8').toString('base64');
  return {
    transferEncoding: 'base64',
    lines: encoded.match(/.{1,76}/g) ?? []
  };
};

export let buildMimeMessage = (params: {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  isHtml?: boolean;
  inReplyTo?: string;
  references?: string;
  threadId?: string;
  attachments?: Array<{
    filename: string;
    mimeType: string;
    content: string;
  }>;
}): string => {
  let boundary = `boundary_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  let lines: string[] = [];

  lines.push(`To: ${params.to.join(', ')}`);
  if (params.cc && params.cc.length > 0) {
    lines.push(`Cc: ${params.cc.join(', ')}`);
  }
  if (params.bcc && params.bcc.length > 0) {
    lines.push(`Bcc: ${params.bcc.join(', ')}`);
  }
  lines.push(`Subject: ${encodeMimeHeaderValue(params.subject)}`);

  if (params.inReplyTo) {
    lines.push(`In-Reply-To: ${params.inReplyTo}`);
  }
  if (params.references) {
    lines.push(`References: ${params.references}`);
  }

  let hasAttachments = params.attachments && params.attachments.length > 0;

  if (hasAttachments) {
    lines.push('MIME-Version: 1.0');
    lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    lines.push('');
    lines.push(`--${boundary}`);
  }

  let contentType = params.isHtml
    ? 'text/html; charset="UTF-8"'
    : 'text/plain; charset="UTF-8"';
  let textPart = buildTextPartBody(params.body);

  if (!hasAttachments) {
    lines.push('MIME-Version: 1.0');
  }
  lines.push(`Content-Type: ${contentType}`);
  if (textPart.transferEncoding) {
    lines.push(`Content-Transfer-Encoding: ${textPart.transferEncoding}`);
  }
  lines.push('');
  lines.push(...textPart.lines);

  if (hasAttachments && params.attachments) {
    for (let attachment of params.attachments) {
      lines.push(`--${boundary}`);
      lines.push(`Content-Type: ${attachment.mimeType}; name="${attachment.filename}"`);
      lines.push('Content-Transfer-Encoding: base64');
      lines.push(`Content-Disposition: attachment; filename="${attachment.filename}"`);
      lines.push('');
      lines.push(attachment.content);
    }
    lines.push(`--${boundary}--`);
  }

  return lines.join('\r\n');
};

/** Encodes a MIME message built as a Unicode string as UTF-8 base64url for Gmail `raw`. */
export let encodeMimeMessage = (mime: string): string =>
  Buffer.from(mime, 'utf8').toString('base64url');

// Byte-preserving: `str` is a binary string (one char per byte), as returned by
// decodeBase64Url for messages that are re-sent unchanged.
export let encodeBase64Url = (str: string): string => {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export let decodeBase64Url = (value: string): string => {
  let base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  let paddingLength = (4 - (base64.length % 4)) % 4;
  return atob(`${base64}${'='.repeat(paddingLength)}`);
};

export let hasMimeHeaderBodySeparator = (raw: string): boolean => /\r?\n\r?\n/.test(raw);

let splitMimeMessage = (raw: string) => {
  let separator = raw.match(/\r?\n\r?\n/);
  if (!separator || separator.index === undefined) {
    return {
      headerBlock: raw,
      body: ''
    };
  }

  return {
    headerBlock: raw.slice(0, separator.index),
    body: raw.slice(separator.index + separator[0].length)
  };
};

let getHeaderGroups = (headerBlock: string) => {
  let groups: string[][] = [];

  for (let line of headerBlock.split(/\r?\n/)) {
    let currentGroup = groups.at(-1);
    if (/^[ \t]/.test(line) && currentGroup) {
      currentGroup.push(line);
      continue;
    }
    groups.push([line]);
  }

  return groups;
};

let getHeaderName = (group: string[]) => {
  let firstLine = group[0];
  if (!firstLine) return '';

  let separatorIndex = firstLine.indexOf(':');
  return separatorIndex >= 0 ? firstLine.slice(0, separatorIndex).trim() : '';
};

let getHeaderValue = (group: string[]) => {
  let firstLine = group[0];
  if (!firstLine) return '';

  let separatorIndex = firstLine.indexOf(':');
  if (separatorIndex < 0) return '';

  return [firstLine.slice(separatorIndex + 1), ...group.slice(1)]
    .map(line => line.trim())
    .join(' ');
};

let replaceHeaderControlCharacters = (value: string, preserveHorizontalTab = false) =>
  Array.from(value, character => {
    let code = character.charCodeAt(0);
    if (preserveHorizontalTab && code === 9) {
      return character;
    }
    return code <= 31 || code === 127 ? ' ' : character;
  }).join('');

let sanitizeHeaderValue = (value: string) =>
  replaceHeaderControlCharacters(value).replace(/ +/g, ' ').trim();

let sanitizeRecipientHeaderValue = (values: string[]) =>
  values.map(value => sanitizeHeaderValue(value)).join(', ');

export let buildForwardedMimeMessage = (params: {
  original: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
}): { raw: string; subject: string } => {
  let { headerBlock, body } = splitMimeMessage(params.original);
  let headerGroups = getHeaderGroups(headerBlock);
  let originalSubject =
    headerGroups.find(group => getHeaderName(group).toLowerCase() === 'subject') ?? [];
  let originalSubjectValue = sanitizeHeaderValue(getHeaderValue(originalSubject));
  let subject = /^\s*fwd:/i.test(originalSubjectValue)
    ? originalSubjectValue
    : `Fwd: ${originalSubjectValue || '(no subject)'}`;
  let lines = [`To: ${sanitizeRecipientHeaderValue(params.to)}`];

  if (params.cc && params.cc.length > 0) {
    lines.push(`Cc: ${sanitizeRecipientHeaderValue(params.cc)}`);
  }
  if (params.bcc && params.bcc.length > 0) {
    lines.push(`Bcc: ${sanitizeRecipientHeaderValue(params.bcc)}`);
  }
  lines.push(`Subject: ${subject}`);

  for (let group of headerGroups) {
    let headerName = getHeaderName(group).toLowerCase();
    if (headerName === 'mime-version' || headerName.startsWith('content-')) {
      lines.push(...group.map(line => replaceHeaderControlCharacters(line, true)));
    }
  }

  return {
    raw: `${lines.join('\r\n')}\r\n\r\n${body}`,
    subject
  };
};
