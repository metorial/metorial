import { Readable } from 'node:stream';
import {
  buildApiServiceError,
  createApiServiceError,
  isApiErrorRecord,
  type SlateAddAttachmentInput
} from 'slates';

type FileContext = { addAttachment: (input: SlateAddAttachmentInput) => Promise<void> };

let maxFileBytes = 50 * 1024 * 1024;
let mimeTypes: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  pdf: 'application/pdf',
  mp4: 'video/mp4',
  zip: 'application/zip'
};

// Only documented provider file origins are eligible. BYOS links remain in metadata.
let getProviderFileUrl = (value: string) => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw createApiServiceError('The provider returned an invalid file URL.');
  }
  let allowed =
    (url.hostname === 'cdn.templated.media' && url.pathname.startsWith('/render/')) ||
    (url.hostname === 'assets.templated.io' && url.pathname.startsWith('/renders/')) ||
    (url.hostname === 'templated-assets.s3.amazonaws.com' &&
      /^\/(renders?|zip-renders)\//.test(url.pathname));
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !allowed) {
    throw createApiServiceError(
      'The file URL uses custom storage or an unsupported host. Use the provider URL in the result.'
    );
  }
  return url;
};

let fetchSignedFile = async (url: URL, mimeType: string) => {
  // Fetch this exact generated result once; never repeat a billable render to renew a link.
  let response = await fetch(url, {
    redirect: 'manual',
    signal: AbortSignal.timeout(30_000),
    credentials: 'omit'
  });
  if (!response.ok || response.status >= 300) {
    await response.body?.cancel();
    throw createApiServiceError(
      'The generated file could not be retrieved; redirects are not followed.'
    );
  }
  let actualMime = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
  if (actualMime !== mimeType || !response.body) {
    await response.body?.cancel();
    throw createApiServiceError('The generated file response had an unexpected content type.');
  }
  let declaredSize = response.headers.get('content-length');
  if (declaredSize && (!/^\d+$/.test(declaredSize) || Number(declaredSize) > maxFileBytes)) {
    await response.body.cancel();
    throw createApiServiceError('The generated file exceeds the 50 MiB preparation limit.');
  }
  let reader = response.body.getReader();
  let chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      let { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxFileBytes) {
        await reader.cancel();
        throw createApiServiceError(
          'The generated file exceeds the 50 MiB preparation limit.'
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  if (!size) throw createApiServiceError('The provider returned an empty file.');
  return new Response(Buffer.concat(chunks), { headers: { 'content-type': mimeType } });
};

export let prepareRenderFiles = async (ctx: FileContext, result: unknown) => {
  let warnings: string[] = [];
  let items = Array.isArray(result) ? result : [result];
  for (let item of items) {
    if (!isApiErrorRecord(item)) continue;
    // Async metadata may include a URL before the file is ready.
    if (
      typeof item.status === 'string' &&
      !['completed', 'complete', 'success', 'succeeded', 'done'].includes(
        item.status.toLowerCase()
      )
    )
      continue;
    if (typeof item.url !== 'string' || !item.url) continue;
    try {
      let url = getProviderFileUrl(item.url);
      let extension = url.pathname.split('.').pop()?.toLowerCase();
      let mimeType = mimeTypes[extension ?? ''];
      if (!mimeType)
        throw createApiServiceError(
          'The generated file format is not supported for download preparation.'
        );
      if (url.search) {
        let content = await fetchSignedFile(url, mimeType);
        await ctx.addAttachment({ type: 'content', content, mimeType });
      } else {
        await ctx.addAttachment({ type: 'url', url, mimeType });
      }
    } catch {
      warnings.push(
        'The provider returned a file URL, but file preparation failed. Use its URL in the result; custom storage hosts, redirects, and files over 50 MiB are not fetched.'
      );
    }
  }
  return warnings;
};

export let preparePdf = async (
  ctx: FileContext,
  body: unknown,
  contentType: unknown,
  filename: string,
  declaredSize?: number
) => {
  let failed = (reason: 'limit' | 'incomplete' | 'invalid' | 'preparation') => ({
    ok: false as const,
    reason
  });
  let nodeBody = body instanceof Readable ? body : undefined;
  let stream = nodeBody ? Readable.toWeb(nodeBody) : body;
  if (!(stream instanceof ReadableStream)) return failed('invalid');
  let reader: ReadableStreamDefaultReader<unknown> | undefined;
  try {
    reader = stream.getReader();
    if (String(contentType).split(';')[0]?.trim().toLowerCase() !== 'application/pdf')
      return failed('invalid');
    if (declaredSize !== undefined && declaredSize > maxFileBytes) return failed('limit');
    let size = 0;
    let chunks: Uint8Array[] = [];
    try {
      while (true) {
        let { done, value } = await reader.read();
        if (done) break;
        if (!(value instanceof Uint8Array)) return failed('invalid');
        // Check before retaining this chunk: buffered content never exceeds the limit.
        if (value.byteLength > maxFileBytes - size) return failed('limit');
        size += value.byteLength;
        chunks.push(value);
      }
    } catch {
      return failed('incomplete');
    }
    let buffer = Buffer.concat(chunks, size);
    if (
      buffer.subarray(0, 5).toString('ascii') !== '%PDF-' ||
      !buffer.subarray(-1024).toString('latin1').trimEnd().endsWith('%%EOF')
    )
      return failed('invalid');
    try {
      await ctx.addAttachment({
        type: 'content',
        content: new Response(buffer, { headers: { 'content-type': 'application/pdf' } }),
        mimeType: 'application/pdf',
        filename
      });
    } catch {
      return failed('preparation');
    }
    return { ok: true as const, size };
  } catch {
    return failed('incomplete');
  } finally {
    if (reader) {
      try {
        await reader.cancel();
      } catch {
        // A failed source can also reject cancellation; release its lock regardless.
      }
      reader.releaseLock();
    }
    if (nodeBody && !nodeBody.destroyed) nodeBody.destroy();
  }
};

// Error responses must also be bounded and closed, before shared error serialization.
export let rejectMergeResponse = async (body: unknown, status: number, statusText: string) => {
  let nodeBody = body instanceof Readable ? body : undefined;
  let stream = nodeBody ? Readable.toWeb(nodeBody) : body;
  let reader: ReadableStreamDefaultReader<unknown> | undefined;
  let data: unknown;
  try {
    if (stream instanceof ReadableStream) {
      reader = stream.getReader();
      let chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        let { done, value } = await reader.read();
        if (done) {
          let text = Buffer.concat(chunks, size).toString('utf8');
          try {
            data = JSON.parse(text);
          } catch {
            data = text;
          }
          break;
        }
        if (!(value instanceof Uint8Array) || value.byteLength > 64 * 1024 - size) break;
        size += value.byteLength;
        chunks.push(value);
      }
    }
  } catch {
    // Status still describes the rejected request even if its error body is unreadable.
  } finally {
    if (reader) {
      try {
        await reader.cancel();
      } catch {
        /* Source rejection can also reject cancellation. */
      }
      reader.releaseLock();
    }
    if (nodeBody && !nodeBody.destroyed) nodeBody.destroy();
  }
  throw buildApiServiceError(
    { response: { status, statusText, data } },
    {
      providerLabel: 'Templated',
      reason: 'templated_api_error',
      operation: 'merging renders',
      extractResponse: (input, helpers) => helpers.getResponseWithBody(input)
    }
  );
};
