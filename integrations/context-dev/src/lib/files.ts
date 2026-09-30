import {
  createApiServiceError,
  getBase64ByteLength,
  type SlateAddAttachmentInput
} from 'slates';
import { z } from 'zod';
import type { ApiRecord } from './client';
import { contextApiError } from './errors';

export interface FileContext {
  addAttachment(input: SlateAddAttachmentInput): Promise<void>;
}

export const fileMetadataSchema = z.object({
  filename: z.string().describe('Name of the downloadable file.'),
  mimeType: z.string().describe('File media type.'),
  byteLength: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe('Decoded file size in bytes when known.')
});

export const decodeFileBase64 = (value: string, maximumBytes: number, label: string) => {
  const encoded = value.replace(/\s/g, '');
  if (!encoded || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) || encoded.length % 4 === 1) {
    throw createApiServiceError(`${label} must contain valid base64-encoded file bytes.`);
  }
  if (encoded.length > Math.ceil(maximumBytes / 3) * 4 + 2) {
    throw createApiServiceError(
      `${label} exceeds the ${maximumBytes / 1024 / 1024} MiB limit.`
    );
  }
  const byteLength = getBase64ByteLength(encoded);
  if (byteLength > maximumBytes) {
    throw createApiServiceError(
      `${label} exceeds the ${maximumBytes / 1024 / 1024} MiB limit.`
    );
  }
  const bytes = Buffer.from(encoded, 'base64');
  if (bytes.toString('base64').replace(/=+$/, '') !== encoded.replace(/=+$/, '')) {
    throw createApiServiceError(`${label} must contain valid base64-encoded file bytes.`);
  }
  return bytes;
};

export const addBase64File = async (
  ctx: FileContext,
  encoded: string,
  mimeType: string,
  filename: string
) => {
  const bytes = decodeFileBase64(encoded, 50 * 1024 * 1024, 'The returned file');
  await ctx.addAttachment({
    type: 'content',
    content: new Response(new Uint8Array(bytes), { headers: { 'content-type': mimeType } }),
    filename,
    mimeType
  });
  return { filename, mimeType, byteLength: bytes.byteLength };
};

export const addImageDataUrl = async (ctx: FileContext, value: string, filename: string) => {
  const match = /^data:(image\/[A-Za-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/.exec(value);
  if (!match) {
    throw createApiServiceError('The returned image is invalid. Request the image again.');
  }
  const mimeType = match[1]!;
  const extension = mimeType
    .slice('image/'.length)
    .replace('jpeg', 'jpg')
    .replace('svg+xml', 'svg');
  return addBase64File(ctx, match[2]!, mimeType, `${filename}.${extension}`);
};

export const addHostedImage = async (ctx: FileContext, url: string, filename: string) => {
  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    if (!response.ok) {
      throw createApiServiceError(
        `The hosted image could not be downloaded (HTTP ${response.status}). Request the image again.`
      );
    }
  } catch (error) {
    throw contextApiError(error, 'download hosted page image');
  }
  const mimeType = response.headers.get('content-type') ?? 'application/octet-stream';
  const length = response.headers.get('content-length');
  const byteLength =
    length !== null && Number.isFinite(Number(length)) ? Number(length) : undefined;
  if (byteLength !== undefined && byteLength > 50 * 1024 * 1024) {
    throw createApiServiceError('The hosted image exceeds the 50 MiB file limit.');
  }
  await ctx.addAttachment({ type: 'content', content: response, mimeType, filename });
  return { filename, mimeType, ...(byteLength === undefined ? {} : { byteLength }) };
};

// Preserve page text while delivering any embedded image bytes as files.
export const deliverInlineImages = async <T>(ctx: FileContext, value: T): Promise<T> => {
  const files = new Map<string, string>();
  let sequence = 0;
  const visit = async (entry: unknown): Promise<unknown> => {
    if (typeof entry === 'string') {
      const pattern = /data:image\/[A-Za-z0-9.+-]+;base64,[A-Za-z0-9+/=]+/g;
      let result = '';
      let position = 0;
      for (const match of entry.matchAll(pattern)) {
        const index = match.index;
        result += entry.slice(position, index);
        const dataUrl = match[0];
        let filename = files.get(dataUrl);
        // Providers may shorten inline image bytes with an ellipsis.
        if (
          entry.slice(index + dataUrl.length).startsWith('...') ||
          entry[index + dataUrl.length] === '…'
        ) {
          result += 'downloadable-image';
        } else {
          if (!filename) {
            const file = await addImageDataUrl(ctx, dataUrl, `page-image-${++sequence}`);
            filename = file.filename;
            files.set(dataUrl, filename);
          }
          result += filename;
        }
        position = index + dataUrl.length;
      }
      return result + entry.slice(position);
    }
    if (Array.isArray(entry)) {
      const result = [];
      for (const item of entry) result.push(await visit(item));
      return result;
    }
    if (entry && typeof entry === 'object') {
      const result: ApiRecord = {};
      for (const [key, item] of Object.entries(entry)) result[key] = await visit(item);
      return result;
    }
    return entry;
  };
  return (await visit(value)) as T;
};

export const batchFileKey = (value: string) => {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw createApiServiceError(
        'The batch returned an invalid download URL. Request the batch again.'
      );
    }
    return `${url.origin}${url.pathname}`;
  } catch {
    throw createApiServiceError(
      'The batch returned an invalid download URL. Request the batch again.'
    );
  }
};

export const batchFileMetadataSchema = z.object({
  filename: z.string(),
  mimeType: z.literal('application/gzip'),
  items: z.number().int().nonnegative(),
  bytes: z.number().int().nonnegative()
});

export const batchResultsSchema = z
  .object({
    expires_at: z.string().describe('Expiry of the current downloadable file links.'),
    files: z.array(batchFileMetadataSchema)
  })
  .nullable();

export const prepareBatch = async <T extends ApiRecord>(
  ctx: FileContext,
  batch: T,
  deliverFiles: boolean
): Promise<T> => {
  if (!batch.results) return batch;
  const results = batch.results;
  if (
    !Array.isArray(results.files) ||
    typeof results.expires_at !== 'string' ||
    !Number.isFinite(Date.parse(results.expires_at))
  ) {
    throw createApiServiceError(
      'The batch returned invalid result file details. Request the batch again.'
    );
  }
  if (deliverFiles && Date.parse(results.expires_at) <= Date.now()) {
    throw createApiServiceError(
      'Context.dev returned expired links for this batch. The result files are currently unavailable.'
    );
  }
  const files = [];
  for (const [index, file] of results.files.entries()) {
    const filename = `batch-${String(batch.id).replace(/[^A-Za-z0-9_-]/g, '_')}-${index + 1}.ndjson.gz`;
    const fileKey = batchFileKey(file.url);
    if (deliverFiles) {
      await ctx.addAttachment({
        type: 'url',
        url: file.url,
        mimeType: 'application/gzip',
        filename,
        refreshReference: { type: 'batch-result', batchId: batch.id, fileKey },
        refreshAt: results.expires_at
      });
    }
    files.push({
      filename,
      mimeType: 'application/gzip' as const,
      items: file.items,
      bytes: file.bytes
    });
  }
  return { ...batch, results: { expires_at: results.expires_at, files } } as T;
};
