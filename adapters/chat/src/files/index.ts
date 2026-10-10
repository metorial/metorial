import { ChatError } from '../errors/error';
import { ChatErrors } from '../errors/factories';
import type { AttachmentRef } from '../schema/content/attachment';

export let attachmentTypeForMime = (
  mimeType: string | null | undefined
): AttachmentRef['type'] => {
  if (mimeType?.startsWith('image/')) return 'image';
  if (mimeType?.startsWith('video/')) return 'video';
  if (mimeType?.startsWith('audio/')) return 'audio';
  return 'file';
};

export let ATTACHMENT_SOURCE_TIMEOUT_MS = 120_000;

/** How long before an expiring provider download URL lapses it should be reissued. */
export let DOWNLOAD_URL_REFRESH_MARGIN_MS = 5 * 60 * 1000;

/** Reads a signed CDN URL's expiry from a hex Unix-seconds query parameter (Discord `ex`, Meta `oe`). */
export let signedUrlHexExpiry = (url: string, param: string): Date | undefined => {
  let value: string | null;
  try {
    value = new URL(url).searchParams.get(param);
  } catch {
    return undefined;
  }
  if (!value || !/^[0-9a-f]{1,12}$/i.test(value)) return undefined;
  let seconds = Number.parseInt(value, 16);
  return seconds > 0 ? new Date(seconds * 1000) : undefined;
};

/** ISO time to reissue a URL expiring at `expiresAt`: `marginMs` early, never in the past. */
export let downloadUrlRefreshAt = (
  expiresAt: Date,
  marginMs: number = DOWNLOAD_URL_REFRESH_MARGIN_MS
) => new Date(Math.max(Date.now(), expiresAt.getTime() - marginMs)).toISOString();

export interface FetchAttachmentSourceOptions {
  action: string;
  /** Byte limit, or a limit chosen from the source's `content-type`. */
  maxBytes?: number | ((contentType: string | undefined) => number);
  attachmentId?: string;
  tooLargeMessage?: string;
  /** Input field named in the validation issue for a non-HTTP(S) URL. */
  field?: string;
  timeoutMs?: number;
}

export interface AttachmentSource {
  bytes: Uint8Array<ArrayBuffer>;
  contentType?: string;
}

// Stops reading once the limit is passed, so a source without content-length is not fully buffered.
let readBody = async (
  response: Response,
  max: number | undefined,
  tooLarge: (actual: number) => ChatError
): Promise<Uint8Array<ArrayBuffer>> => {
  if (!response.body) return new Uint8Array(await response.arrayBuffer());

  let reader = response.body.getReader();
  let chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    let chunk = await reader.read();
    if (chunk.done) break;
    let value = chunk.value;
    total += value.byteLength;
    if (max !== undefined && total > max) {
      await reader.cancel().catch(() => undefined);
      throw tooLarge(total);
    }
    chunks.push(value);
  }

  let bytes = new Uint8Array(total);
  let offset = 0;
  for (let chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
};

/** Downloads an upload's source file, enforcing the byte limit before and after reading. */
export let fetchAttachmentSource = async (
  sourceUrl: string,
  options: FetchAttachmentSourceOptions
): Promise<AttachmentSource> => {
  let { action, attachmentId } = options;

  let url: URL | undefined;
  try {
    url = new URL(sourceUrl);
  } catch {}
  if (!url || (url.protocol !== 'https:' && url.protocol !== 'http:')) {
    let field = options.field ?? 'fileUrl';
    throw ChatErrors.inputInvalid({
      action,
      message: `${field} must be an HTTP(S) URL.`,
      issues: [{ path: [field], code: 'invalid_url', message: 'Expected http or https' }]
    });
  }

  let downloadFailed = (message: string, cause?: unknown) =>
    ChatErrors.attachmentDownloadFailed({ action, attachmentId, message, cause });

  let signal = AbortSignal.timeout(options.timeoutMs ?? ATTACHMENT_SOURCE_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(url, { signal });
  } catch (error) {
    throw downloadFailed('Could not fetch the file from its source URL.', error);
  }

  let discard = () => response.body?.cancel().catch(() => undefined);
  if (!response.ok) {
    discard();
    throw downloadFailed(
      `Could not fetch the file from its source URL: HTTP ${response.status}.`
    );
  }

  let contentType = response.headers.get('content-type') ?? undefined;
  let max =
    typeof options.maxBytes === 'function' ? options.maxBytes(contentType) : options.maxBytes;
  let tooLarge = (actual: number) =>
    ChatErrors.attachmentTooLarge({
      action,
      id: attachmentId,
      max,
      actual,
      message: options.tooLargeMessage
    });

  let declared = Number(response.headers.get('content-length'));
  if (max !== undefined && Number.isFinite(declared) && declared > max) {
    discard();
    throw tooLarge(declared);
  }

  let bytes: Uint8Array<ArrayBuffer>;
  try {
    bytes = await readBody(response, max, tooLarge);
  } catch (error) {
    if (ChatError.is(error)) throw error;
    throw downloadFailed('Could not read the file from its source URL.', error);
  }

  return { bytes, contentType };
};
