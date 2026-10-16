import { createApiServiceError, isApiErrorRecord } from 'slates';
import type { z } from 'zod';
import type { qrParametersSchema, qrSchema } from './schemas';

export let validateDownloadUrl = (value: string) => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw createApiServiceError('APIVerve returned an invalid download URL.');
  }
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw createApiServiceError('APIVerve returned an unsupported download URL.');
  }
  return url.toString();
};

export let qrMimeType = (format: string) => {
  let types: Record<string, string> = {
    png: 'image/png',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    webp: 'image/webp',
    svg: 'image/svg+xml'
  };
  return types[format.toLowerCase()] ?? 'application/octet-stream';
};

export let qrRefreshAt = (expires: number) => {
  let timestamp = expires - 60000;
  if (
    !Number.isFinite(timestamp) ||
    !Number.isSafeInteger(expires) ||
    expires <= Date.now() ||
    Math.abs(timestamp) > 8640000000000000
  ) {
    throw createApiServiceError(
      'APIVerve returned an invalid or expired generated-file download.'
    );
  }
  return new Date(Math.max(timestamp, Date.now())).toISOString();
};

let credentialField =
  /^(?:authorization|x[-_]?api[-_]?key|api[-_]?key|access[-_]?token|refresh[-_]?token|token|secret|password)$/i;
let credentialQuery =
  /[?&](?:api[-_]?key|x[-_]?api[-_]?key|access[-_]?token|refresh[-_]?token|token|secret|password)=[^&#\s]+/i;

export let assertFileReferenceSafe = (reference: unknown, token: string) => {
  let secret = token.trim();
  let encodedSecret = encodeURIComponent(secret);
  let containsSecret = (value: string) =>
    !!secret && (value.includes(secret) || value.includes(encodedSecret));
  let unsafeString = (value: string): boolean => {
    if (credentialQuery.test(value)) return true;
    let current = value;
    let original = true;
    // Every changing percent-decoding step shrinks the string. This bound covers all
    // layers without a fixed-pass cutoff that could treat a still-encoded key as safe.
    for (let remaining = value.length + 1; remaining > 0; remaining--) {
      if (containsSecret(current)) return true;
      let url: URL | undefined;
      try {
        url = new URL(current, 'https://api.apiverve.com/v1/');
      } catch {
        /* Not all generated content is a URL. */
      }
      if (
        url &&
        (containsSecret(url.href) ||
          (secret && url.hostname.includes(secret.toLowerCase())) ||
          [url.username, url.password, url.pathname, url.hash].some(containsSecret) ||
          [...url.searchParams.entries()].some(
            ([key, item]) =>
              containsSecret(key) ||
              containsSecret(item) ||
              (original && credentialField.test(key) && item.length > 0)
          ))
      )
        return true;
      let decoded = current.replace(/(?:%[0-9a-f]{2})+/gi, part => {
        try {
          return decodeURIComponent(part);
        } catch {
          return part.replace(/%([0-9a-f]{2})/gi, (_match, hex: string) =>
            String.fromCharCode(Number.parseInt(hex, 16))
          );
        }
      });
      if (decoded === current) return false;
      if (decoded.length >= current.length) return true;
      current = decoded;
      original = false;
    }
    return true;
  };
  let unsafe = (root: unknown): boolean => {
    let pending: unknown[] = [root];
    let visited = new WeakSet<object>();
    while (pending.length) {
      let value = pending.pop();
      if (typeof value === 'string') {
        if (unsafeString(value)) return true;
        continue;
      }
      if (typeof value !== 'object' || value === null || visited.has(value)) continue;
      visited.add(value);
      if (Array.isArray(value)) {
        for (let item of value) pending.push(item);
      } else if (isApiErrorRecord(value))
        for (let [key, item] of Object.entries(value)) {
          if (credentialField.test(key)) return true;
          pending.push(key, item);
        }
    }
    return false;
  };
  if (unsafe(reference))
    throw createApiServiceError(
      'Remove API credentials from generated-file content and options before requesting a renewable download.'
    );
};

export let assertQrReferenceSafe = (
  parameters: z.infer<typeof qrParametersSchema>,
  token: string
) => assertFileReferenceSafe({ parameters }, token);

export let prepareQrDownload = (
  data: z.infer<typeof qrSchema>,
  parameters: z.infer<typeof qrParametersSchema>
) => ({
  type: 'url' as const,
  url: validateDownloadUrl(data.downloadURL),
  mimeType: qrMimeType(data.format),
  refreshAt: qrRefreshAt(data.expires),
  refreshReference: { parameters }
});

export let regeneratableFileEndpoints = new Set(['qrcodegenerator', 'barcodegenerator']);

export interface GeneratedFileReference {
  kind: 'generated_file';
  endpoint: string;
  parameters?: Record<string, unknown>;
  path: string[];
}

export interface GeneratedDownload {
  url: string;
  expires?: number;
  path: string[];
}

// Keep sibling expiry metadata and the original result path for deterministic renewal.
export let getGeneratedDownloads = (
  data: unknown,
  path: string[] = []
): GeneratedDownload[] => {
  if (Array.isArray(data))
    return data.flatMap((item, index) =>
      getGeneratedDownloads(item, [...path, String(index)])
    );
  if (!isApiErrorRecord(data)) return [];
  let result: GeneratedDownload[] = [];
  if (typeof data.downloadURL === 'string') {
    if (Object.hasOwn(data, 'expires') && typeof data.expires !== 'number')
      throw createApiServiceError(
        'APIVerve returned a generated-file expiry with an invalid type.'
      );
    result.push({
      url: validateDownloadUrl(data.downloadURL),
      path,
      ...(typeof data.expires === 'number' ? { expires: data.expires } : {})
    });
  }
  for (let [key, value] of Object.entries(data)) {
    if (typeof value === 'object' && value !== null)
      result.push(...getGeneratedDownloads(value, [...path, key]));
  }
  return result;
};
