import { createApiServiceError, isApiErrorRecord } from 'slates';

// Official Product API transcription response: https://dev.happyscribe.com/sections/product/#retrieve-a-transcription
let documentedDownloadHosts = new Set(['media.happyscribe.com']);

export let validateDownloadUrl = (value: string, now = Date.now()) => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw createApiServiceError('Happy Scribe returned an invalid download URL.');
  }
  if (
    url.protocol !== 'https:' ||
    !documentedDownloadHosts.has(url.hostname) ||
    url.username ||
    url.password ||
    (url.port && url.port !== '443') ||
    url.hash
  ) {
    throw createApiServiceError(
      'The download URL is not on a documented Happy Scribe media host. Download this export in Happy Scribe instead.',
      { reason: 'happy_scribe_unverified_download_host' }
    );
  }

  let query = new Map([...url.searchParams].map(([key, val]) => [key.toLowerCase(), val]));
  let expiries: number[] = [];
  for (let prefix of ['x-amz', 'x-goog']) {
    let date = query.get(`${prefix}-date`);
    let seconds = query.get(`${prefix}-expires`);
    if (date === undefined && seconds === undefined) continue;
    let match = date?.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
    if (!match || !seconds || !/^\d+$/.test(seconds)) {
      throw createApiServiceError('Happy Scribe returned an invalid signed URL expiry.');
    }
    let signedAt = Date.parse(
      `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}Z`
    );
    let expiresAt = signedAt + Number(seconds) * 1000;
    if (!Number.isFinite(expiresAt)) {
      throw createApiServiceError('Happy Scribe returned an invalid signed URL expiry.');
    }
    expiries.push(expiresAt);
  }
  let epoch = query.get('expires');
  if (epoch !== undefined) {
    if (!/^\d+$/.test(epoch) || !Number.isFinite(Number(epoch) * 1000)) {
      throw createApiServiceError('Happy Scribe returned an invalid signed URL expiry.');
    }
    expiries.push(Number(epoch) * 1000);
  }
  let azureExpiry = query.get('se');
  if (azureExpiry !== undefined) {
    let expiry = Date.parse(azureExpiry);
    if (!Number.isFinite(expiry)) {
      throw createApiServiceError('Happy Scribe returned an invalid signed URL expiry.');
    }
    expiries.push(expiry);
  }
  if (expiries.some(expiry => expiry <= now)) {
    throw createApiServiceError(
      'This download URL has expired. Request the media again, or explicitly create a new export.',
      { reason: 'happy_scribe_expired_download' }
    );
  }
  return url.href;
};

let invalidFile = () =>
  createApiServiceError(
    'The downloaded file could not be validated. Download this format in Happy Scribe instead.'
  );

let decodeTextFile = (bytes: Uint8Array) => {
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw invalidFile();
  }
  if (
    !text.trim() ||
    bytes.some(
      byte => (byte < 0x20 && byte !== 0x09 && byte !== 0x0a && byte !== 0x0d) || byte === 0x7f
    ) ||
    /^\s*(?:<!doctype\s+html\b|<html\b)/i.test(text)
  ) {
    throw invalidFile();
  }
  try {
    let value: unknown = JSON.parse(text);
    if (
      isApiErrorRecord(value) &&
      ('error' in value ||
        'errors' in value ||
        'error_description' in value ||
        value.success === false ||
        (typeof value.status === 'number' && value.status >= 400))
    ) {
      throw invalidFile();
    }
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
  }
  return text.replace(/\r\n?/g, '\n');
};

// SubRip cue blocks and WebVTT timestamps are validated locally; exports whose
// document structure is not established here are deliberately declined.
let timestamp = (value: string, separator: ',' | '.') => {
  let parts = value.replace(separator, ':').split(':').map(Number);
  if (parts.length === 3) parts.unshift(0);
  return (
    ((parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0)) * 1000 + (parts[3] ?? 0)
  );
};

let validSubtitleTiming = (line: string, format: 'srt' | 'vtt') => {
  let match =
    format === 'srt'
      ? line.match(
          /^(\d{2,}:[0-5]\d:[0-5]\d,\d{3})[ \t]+-->[ \t]+(\d{2,}:[0-5]\d:[0-5]\d,\d{3})$/
        )
      : line.match(
          /^((?:\d{2,}:)?[0-5]\d:[0-5]\d\.\d{3})[ \t]+-->[ \t]+((?:\d{2,}:)?[0-5]\d:[0-5]\d\.\d{3})(?:[ \t]+[^<>\n]+)?$/
        );
  if (!match?.[1] || !match[2]) return false;
  let separator: ',' | '.' = format === 'srt' ? ',' : '.';
  return timestamp(match[2], separator) > timestamp(match[1], separator);
};

let validSrt = (text: string) =>
  text
    .trim()
    .split(/\n[ \t]*\n/)
    .every(block => {
      let lines = block.split('\n');
      return (
        /^\d+$/.test(lines[0] ?? '') &&
        validSubtitleTiming(lines[1] ?? '', 'srt') &&
        lines.slice(2).some(line => line.trim())
      );
    });

let validVtt = (text: string) => {
  let blocks = text.trim().split(/\n[ \t]*\n/);
  if (!/^WEBVTT(?:[ \t][^\n]*)?$/.test(blocks.shift() ?? '')) return false;
  let cues = 0;
  for (let block of blocks) {
    if (/^(?:NOTE(?:[ \t\n]|$)|STYLE\n|REGION\n)/.test(block)) continue;
    let lines = block.split('\n');
    let timingIndex = (lines[0] ?? '').includes('-->') ? 0 : 1;
    if (
      !validSubtitleTiming(lines[timingIndex] ?? '', 'vtt') ||
      !lines.slice(timingIndex + 1).some(line => line.trim())
    )
      return false;
    cues++;
  }
  return cues > 0;
};

export let validateDownloadedFile = (data: unknown, format: string) => {
  let bytes: Buffer;
  if (data instanceof ArrayBuffer) bytes = Buffer.from(data);
  else if (ArrayBuffer.isView(data)) {
    bytes = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  } else {
    throw createApiServiceError('Happy Scribe did not return file bytes.');
  }
  if (!bytes.length) throw createApiServiceError('Happy Scribe returned an empty file.');

  let text = bytes.subarray(0, 1024).toString('utf8');
  if (format === 'mp3') {
    if (
      !(text.startsWith('ID3') || (bytes[0] === 0xff && ((bytes[1] ?? 0) & 0xe0) === 0xe0))
    ) {
      throw createApiServiceError('Happy Scribe did not return an MP3 file.');
    }
    return { bytes, mimeType: 'audio/mpeg', extension: 'mp3' };
  }
  if (format === 'mp4') {
    if (bytes.subarray(4, 8).toString('ascii') !== 'ftyp') {
      throw createApiServiceError('Happy Scribe did not return an MP4 file.');
    }
    return { bytes, mimeType: 'video/mp4', extension: 'mp4' };
  }
  if (format === 'pdf' && text.startsWith('%PDF-')) {
    return { bytes, mimeType: 'application/pdf', extension: 'pdf' };
  }
  if (!['txt', 'srt', 'facebook_srt', 'vtt', 'json'].includes(format)) {
    throw invalidFile();
  }
  let decoded = decodeTextFile(bytes);
  if (format === 'txt') return { bytes, mimeType: 'text/plain', extension: 'txt' };
  if ((format === 'srt' || format === 'facebook_srt') && validSrt(decoded)) {
    return { bytes, mimeType: 'application/x-subrip', extension: 'srt' };
  }
  if (format === 'vtt' && validVtt(decoded)) {
    return { bytes, mimeType: 'text/vtt', extension: 'vtt' };
  }
  if (format === 'json') {
    try {
      let paragraphs: unknown = JSON.parse(decoded);
      if (
        Array.isArray(paragraphs) &&
        paragraphs.every(
          paragraph =>
            isApiErrorRecord(paragraph) &&
            Array.isArray(paragraph.words) &&
            paragraph.words.every(
              word => isApiErrorRecord(word) && typeof word.text === 'string'
            )
        )
      )
        return { bytes, mimeType: 'application/json', extension: 'json' };
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
    }
  }
  throw invalidFile();
};
