import { ServiceError } from '@lowerdeck/error';
import { createApiServiceError } from 'slates';
import type { TelnyxClient } from './client';
import { type faxSchema, invalid, parse, z } from './native';

const MAX_PDF_BYTES = 16 * 1024 * 1024;
const referenceSchema = z
  .object({
    faxId: z.string().min(1),
    connectionId: z.string().min(1),
    from: z.string(),
    to: z.string(),
    direction: z.literal('inbound')
  })
  .strict();
export type FaxReference = z.infer<typeof referenceSchema>;
export function pdfUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return invalid(
      'The fax PDF URL is unavailable. Request the exact fax again.',
      'invalid_file_url'
    );
  }
  // The current native examples use AWS signed object URLs; no API bearer belongs on them.
  const aws =
    url.hostname === 's3.amazonaws.com' ||
    /^[a-z0-9.-]+\.s3(?:[.-][a-z0-9-]+)?\.amazonaws\.com$/.test(url.hostname);
  if (
    url.protocol !== 'https:' ||
    url.port ||
    url.username ||
    url.password ||
    url.hash ||
    !aws
  )
    invalid(
      'This fax PDF uses an unsupported storage URL. Retrieve it through Telnyx; only the documented HTTPS AWS object URL contract is accepted here.',
      'unsupported_file_url'
    );
  return url;
}
export function signatureExpiry(url: URL): string | undefined {
  const date = url.searchParams.get('X-Amz-Date'),
    seconds = url.searchParams.get('X-Amz-Expires');
  if (!date || !seconds || !/^\d{8}T\d{6}Z$/.test(date) || !/^\d+$/.test(seconds))
    return undefined;
  const stamp = Date.parse(
    `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T${date.slice(9, 11)}:${date.slice(11, 13)}:${date.slice(13, 15)}Z`
  );
  const duration = Number(seconds);
  if (
    !Number.isFinite(stamp) ||
    !Number.isSafeInteger(duration) ||
    duration < 1 ||
    duration > 604800
  )
    return undefined;
  // The native Fax documentation limits temporary links to ten minutes even when
  // a signing example carries a longer AWS expiry. Never reset age at retrieval.
  const expires = stamp + Math.min(duration, 600) * 1000;
  if (expires <= Date.now() + 30_000) return undefined;
  return new Date(expires).toISOString();
}
export async function inboundDownload(client: TelnyxClient, input: unknown) {
  const reference = parse(referenceSchema, input);
  const fax = await client.refreshInboundFax(reference.faxId, reference);
  if (
    fax.connection_id !== reference.connectionId ||
    fax.from !== reference.from ||
    fax.to !== reference.to ||
    fax.direction !== reference.direction
  )
    invalid(
      'The renewed fax no longer matches the original file reference.',
      'fax_identity_changed'
    );
  if (!fax.media_url)
    invalid('Telnyx did not return the inbound fax PDF URL.', 'file_unavailable');
  const url = pdfUrl(fax.media_url),
    expiresAt = signatureExpiry(url);
  if (!expiresAt)
    invalid(
      'Telnyx did not return a safely dated renewed PDF link. Retrieve the PDF again as bounded content.',
      'unknown_file_expiry'
    );
  return { url: url.toString(), expiresAt, headers: {}, query: {} };
}
export async function downloadPdf(urlValue: string): Promise<Response> {
  const url = pdfUrl(urlValue);
  let response: Response;
  try {
    response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(30_000) });
  } catch {
    throw createApiServiceError(
      'The fax PDF could not be downloaded. Request the exact fax again.',
      { reason: 'file_download_failed' }
    );
  }
  if (response.status !== 200 || !response.body) {
    await response.body?.cancel().catch(() => undefined);
    invalid(
      `Fax PDF download failed (HTTP ${response.status}). Request the exact fax again.`,
      'file_download_failed'
    );
  }
  const declared = response.headers.get('content-length');
  if (
    declared !== null &&
    (!/^\d+$/.test(declared) || Number(declared) < 5 || Number(declared) > MAX_PDF_BYTES)
  ) {
    await response.body.cancel().catch(() => undefined);
    invalid('Fax PDF size is invalid or exceeds the 16 MiB delivery limit.', 'file_too_large');
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const item = await reader.read();
      if (item.done) break;
      length += item.value.byteLength;
      if (length > MAX_PDF_BYTES) {
        await reader.cancel().catch(() => undefined);
        invalid('Fax PDF exceeds the 16 MiB delivery limit.', 'file_too_large');
      }
      chunks.push(item.value);
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    if (error instanceof ServiceError) throw error;
    throw createApiServiceError('The fax PDF stream failed. Request the exact fax again.', {
      reason: 'file_download_failed'
    });
  } finally {
    reader.releaseLock();
  }
  const bytes = Buffer.concat(
    chunks.map(chunk => Buffer.from(chunk)),
    length
  );
  if (declared !== null && length !== Number(declared))
    invalid('The fax PDF size differs from its download receipt.', 'file_size_mismatch');
  if (
    bytes.subarray(0, 5).toString() !== '%PDF-' ||
    !bytes.subarray(Math.max(0, length - 1024)).includes(Buffer.from('%%EOF'))
  )
    invalid('The fax download is not a complete PDF file.', 'invalid_pdf');
  return new Response(bytes, {
    headers: { 'content-type': 'application/pdf', 'content-length': String(length) }
  });
}
export const faxOutput = (fax: z.infer<typeof faxSchema>) => ({
  faxId: fax.id,
  connectionId: fax.connection_id,
  from: fax.from,
  to: fax.to,
  status: fax.status,
  direction: fax.direction,
  failureReason: fax.failure_reason,
  createdAt: fax.created_at,
  updatedAt: fax.updated_at
});
