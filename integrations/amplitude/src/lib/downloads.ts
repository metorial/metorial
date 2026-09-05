import { Buffer } from 'node:buffer';
import type { Readable } from 'node:stream';
import { ServiceError } from '@lowerdeck/error';
import { createAxios, getResponseHeaderValue } from 'slates';
import { amplitudeServiceError } from './errors';

export const DOWNLOAD_LIMIT = 32 * 1024 * 1024;
export type DownloadBudget = { remaining: number; replay?: boolean };
export type DownloadedFile = { bytes: Buffer; contentType: string };
type HttpClient = ReturnType<typeof createAxios>;

const sizeError = (budget: DownloadBudget) =>
  amplitudeServiceError(
    `The export exceeds the 32 MiB download limit.${budget.replay ? ' Retry with a lower page limit.' : ' Request a smaller cohort or fewer user properties.'}`
  );

export const validateStorageUrl = (value: string) => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw amplitudeServiceError('Amplitude returned an invalid download URL.');
  }
  // Accept only S3 service endpoints issued by Amplitude, never arbitrary redirects.
  const host = url.hostname.toLowerCase();
  const s3 = /^(?:[a-z0-9][a-z0-9.-]*\.)?s3(?:[.-][a-z0-9-]+)?\.amazonaws\.com(?:\.cn)?$/.test(
    host
  );
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !s3)
    throw amplitudeServiceError('Amplitude returned an unsupported download location.');
  return url.toString();
};

export const receiveFile = async (
  client: HttpClient,
  url: string,
  budget: DownloadBudget,
  allowStorageRedirect = false
): Promise<{ file?: DownloadedFile; redirect?: string; expired?: boolean }> => {
  if (budget.remaining <= 0) throw sizeError(budget);
  let stream: Readable | undefined;
  try {
    const response = await client.get<Readable>(url, {
      responseType: 'stream',
      adapter: 'http',
      decompress: false,
      maxRedirects: 0,
      timeout: 30_000,
      signal: AbortSignal.timeout(30_000),
      maxContentLength: budget.remaining,
      validateStatus: () => true
    });
    stream = response.data;
    if (response.status === 302 && allowStorageRedirect) {
      const location = getResponseHeaderValue(response.headers, 'location');
      stream.destroy();
      if (!location)
        throw amplitudeServiceError('Amplitude did not return a cohort download location.');
      return { redirect: validateStorageUrl(location) };
    }
    if (response.status === 401 || response.status === 403) {
      stream.destroy();
      return { expired: true };
    }
    if (response.status < 200 || response.status >= 300) {
      stream.destroy();
      throw amplitudeServiceError(
        `Amplitude file download failed with HTTP ${response.status}.`
      );
    }
    const length = Number(getResponseHeaderValue(response.headers, 'content-length'));
    if (Number.isFinite(length) && length > budget.remaining) throw sizeError(budget);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      if (bytes.byteLength > budget.remaining) throw sizeError(budget);
      budget.remaining -= bytes.byteLength;
      chunks.push(bytes);
    }
    const bytes = Buffer.concat(chunks);
    const gzip = bytes[0] === 0x1f && bytes[1] === 0x8b;
    return {
      file: {
        bytes,
        contentType: gzip
          ? 'application/gzip'
          : getResponseHeaderValue(response.headers, 'content-type')?.split(';')[0]?.trim() ||
            'application/octet-stream'
      }
    };
  } catch (error) {
    stream?.destroy();
    // File transport errors may contain presigned URLs; expose only a safe message.
    if (error instanceof ServiceError) throw error;
    throw amplitudeServiceError(
      'The file download failed or timed out. Retry the export with the same request ID or cursor.'
    );
  }
};

export const downloadStorageFile = (url: string, budget: DownloadBudget) =>
  receiveFile(createAxios(), validateStorageUrl(url), budget);
