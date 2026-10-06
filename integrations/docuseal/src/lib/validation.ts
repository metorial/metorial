import { Buffer } from 'node:buffer';
import { ServiceError } from '@lowerdeck/error';
import {
  AuthConfigSecretRedactor,
  buildApiServiceError,
  createApiServiceError,
  getApiErrorStatus,
  isApiErrorRecord
} from 'slates';
import type { z } from 'zod';
export type Row = Record<string, unknown>;
export function fail(message: string, reason = 'docuseal_validation'): never {
  throw createApiServiceError(message, { reason, parent: {} });
}
export function text(value: unknown, label: string): string {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    Array.from(value).some(character => {
      const code = character.charCodeAt(0);
      return (code < 32 && code !== 9 && code !== 10 && code !== 13) || code === 127;
    })
  )
    fail(`${label} must be non-empty text without control characters.`);
  return value;
}
export function id(value: number, label = 'ID'): number {
  if (!Number.isSafeInteger(value) || value < 1)
    fail(
      `${label} must be a positive safe integer returned by the matching list or get tool.`
    );
  return value;
}
export function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    fail(
      'DocuSeal returned an unexpected response. Read current state before retrying; sending, signing or another write may already have completed.',
      'docuseal_invalid_response'
    );
  return parsed.data;
}
export function privacy(value: unknown, token: string): unknown {
  const redactor = new AuthConfigSecretRedactor({
    token,
    base64Token: Buffer.from(token).toString('base64'),
    base64UrlToken: Buffer.from(token).toString('base64url')
  });
  const visit = (v: unknown): void => {
    if (typeof v === 'string') {
      let decoded = v;
      for (let attempt = 0; attempt < 4; attempt++) {
        if (redactor.redactEmbedded(decoded) !== decoded)
          fail(
            'DocuSeal returned authentication data unexpectedly. Check the connection and request current state.',
            'docuseal_private_response'
          );
        try {
          const next = decodeURIComponent(decoded);
          if (next === decoded) break;
          decoded = next;
        } catch {
          const next = decoded.replace(/(?:%[0-9a-f]{2})+/gi, segment =>
            Buffer.from(segment.replace(/%/g, ''), 'hex').toString('utf8')
          );
          if (next === decoded) break;
          decoded = next;
        }
      }
    } else if (Array.isArray(v)) v.forEach(visit);
    else if (isApiErrorRecord(v))
      for (const [key, child] of Object.entries(v)) {
        visit(key);
        visit(child);
      }
  };
  visit(value);
  return value;
}
export function apiError(error: unknown): never {
  if (error instanceof ServiceError) throw error;
  let status = getApiErrorStatus(error);
  if (isApiErrorRecord(error) && error.name === 'SlateError' && isApiErrorRecord(error.data)) {
    const baggage = isApiErrorRecord(error.data.baggage) ? error.data.baggage : undefined;
    const native =
      baggage && isApiErrorRecord(baggage.serviceErrorData)
        ? baggage.serviceErrorData.upstreamStatus
        : undefined;
    if (
      typeof native === 'number' &&
      Number.isInteger(native) &&
      native >= 100 &&
      native <= 599
    )
      status = native;
  }
  throw buildApiServiceError(
    { response: { status } },
    {
      providerLabel: 'DocuSeal',
      operation: 'request',
      reason: 'docuseal_api_error',
      parent: {},
      extractMessage: () =>
        ' Check API-key permissions and current document state before retrying. Sending, signing or another write may already have completed.'
    }
  );
}
export function fileUrl(value: unknown): string {
  if (typeof value !== 'string') fail('DocuSeal did not return a downloadable file URL.');
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    fail('DocuSeal did not return a valid downloadable file URL.', 'docuseal_invalid_file');
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.hash ||
    !['docuseal.com', 'docuseal.eu', 'www.docuseal.com', 'www.docuseal.eu'].includes(
      url.hostname
    ) ||
    !/^\/(?:file|blobs)\//.test(url.pathname)
  )
    fail(
      'DocuSeal returned an unsupported file location. Request current documents from the connected cloud environment.',
      'docuseal_invalid_file'
    );
  return value;
}
