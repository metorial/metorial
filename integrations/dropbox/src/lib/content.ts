import { dropboxServiceError } from './errors';

export type DropboxContentEncoding = 'text' | 'base64';

let base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;

export let decodeDropboxContent = (
  content: string,
  encoding: DropboxContentEncoding = 'text'
) => {
  if (encoding === 'text') {
    return content;
  }

  let normalized = content.replace(/\s+/g, '');
  let firstPadding = normalized.indexOf('=');
  if (
    normalized.length % 4 !== 0 ||
    !base64Pattern.test(normalized) ||
    (firstPadding !== -1 && firstPadding < normalized.length - 2)
  ) {
    throw dropboxServiceError(
      'content must be valid base64 when contentEncoding is "base64".'
    );
  }

  return Buffer.from(normalized, 'base64');
};

export let getDropboxContentLength = (content: string | Uint8Array | Buffer) =>
  typeof content === 'string' ? Buffer.byteLength(content) : content.byteLength;
