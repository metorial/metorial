import { Buffer } from 'node:buffer';
import { googleChatValidationError } from './errors';

export type DecodeGoogleChatBase64Options = {
  /** Input field name used in validation messages, such as contentBase64. */
  field: string;
  /** Largest accepted decoded size in bytes (inclusive). */
  maxBytes: number;
  /** Message raised when the decoded content exceeds maxBytes. */
  tooLargeMessage: string;
};

/** Validates strict base64 input and returns the decoded bytes. */
export let decodeGoogleChatBase64 = (
  value: string,
  { field, maxBytes, tooLargeMessage }: DecodeGoogleChatBase64Options
) => {
  let invalid = () =>
    googleChatValidationError(`${field} must be valid base64-encoded content.`);
  let normalized = value.trim().replace(/\s/g, '');
  if (
    !normalized ||
    normalized.length % 4 === 1 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)
  ) {
    throw invalid();
  }

  let bytes = Buffer.from(normalized, 'base64');
  if (bytes.length === 0) {
    throw googleChatValidationError(`${field} must contain at least one byte.`);
  }
  let canonical = bytes.toString('base64').replace(/=+$/, '');
  if (canonical !== normalized.replace(/=+$/, '')) throw invalid();
  if (bytes.byteLength > maxBytes) throw googleChatValidationError(tooLargeMessage);

  return bytes;
};
