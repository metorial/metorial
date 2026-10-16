import { createApiServiceError } from 'slates';

// The official logo response uses this RiteKit-owned S3 bucket. Never follow
// redirects or fetch arbitrary URLs supplied by callers while retaining files.
let isRiteKitImageUrl = (url: URL) =>
  url.protocol === 'https:' &&
  !url.username &&
  !url.password &&
  (!url.port || url.port === '443') &&
  ((url.hostname === 'cdn.ritekit.com' && url.pathname.startsWith('/assets/')) ||
    (url.hostname === 'ritekit.com' && url.pathname.startsWith('/assets/')) ||
    (url.hostname === 'api.ritekit.com' &&
      /^\/api\/v2\/image\/logo\/[a-f0-9]{64}$/.test(url.pathname)) ||
    (url.hostname === 's3.us-east-2.amazonaws.com' &&
      url.pathname.startsWith('/storage.ritekit.com/')) ||
    url.hostname === 'storage.ritekit.com.s3.us-east-2.amazonaws.com');

let hasImageSignature = (content: Buffer, mimeType: string) => {
  if (mimeType === 'image/png')
    return content.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mimeType === 'image/jpeg')
    return content.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
  if (mimeType === 'image/gif')
    return ['GIF87a', 'GIF89a'].includes(content.subarray(0, 6).toString('ascii'));
  if (mimeType === 'image/webp')
    return (
      content.subarray(0, 4).toString('ascii') === 'RIFF' &&
      content.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  if (mimeType === 'image/svg+xml')
    return /^\s*(?:<\?xml[\s\S]*?\?>\s*)?(?:<!--[\s\S]*?-->\s*)*<svg(?:\s|>)/.test(
      content.subarray(0, 4096).toString('utf8')
    );
  return false;
};

let prepareImageDownload = async (
  imageUrl: string | undefined
): Promise<{ content: Response; error?: never } | { content?: never; error: string }> => {
  try {
    if (!imageUrl) {
      throw createApiServiceError('RiteKit did not return an image URL.');
    }
    let url = new URL(imageUrl);
    if (!isRiteKitImageUrl(url)) {
      throw createApiServiceError(
        'The returned image is outside the supported RiteKit download hosts.'
      );
    }
    let response = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(30_000)
    });
    if (!response.ok) {
      throw createApiServiceError(`The image download returned HTTP ${response.status}.`);
    }
    let mimeType = response.headers.get('content-type')?.split(';')[0]?.trim();
    if (!mimeType?.startsWith('image/')) {
      throw createApiServiceError('The image download did not return an image content type.');
    }
    let limit = 20 * 1024 * 1024;
    let reader = response.body?.getReader();
    if (!reader) throw createApiServiceError('The image download returned no content.');
    let chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        let { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > limit) {
          throw createApiServiceError('The image exceeds the supported 20 MiB download size.');
        }
        chunks.push(value);
      }
    } finally {
      await reader.cancel();
    }
    let content = Buffer.concat(chunks);
    if (!hasImageSignature(content, mimeType)) {
      throw createApiServiceError(
        'The image download did not match a supported image format.'
      );
    }
    return { content: new Response(content, { headers: { 'content-type': mimeType } }) };
  } catch {
    // Generation already succeeded. Preserve its URL and report delivery failure
    // separately so a retry cannot silently create another billable image.
    return {
      error:
        'RiteKit returned the image, but its downloadable copy could not be prepared. Use the returned image URL before it expires.'
    };
  }
};

export let deliverImageDownload = async (
  imageUrl: string | undefined,
  addImage: (content: Response) => Promise<unknown>
): Promise<string | undefined> => {
  let download = await prepareImageDownload(imageUrl);
  if (!download.content) return download.error;
  try {
    await addImage(download.content);
    return undefined;
  } catch {
    return 'RiteKit returned the image, but its downloadable copy could not be prepared. Use the returned image URL before it expires.';
  }
};
