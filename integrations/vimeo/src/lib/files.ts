import { z } from 'zod';
import type { VimeoClient } from './client';
import { exact, invalid, parse } from './native';

const number = z.number().int().nonnegative().refine(Number.isSafeInteger);
const fileSchema = z
  .object({
    quality: z.enum(['audio', 'hd', 'hls', 'mobile', 'sd', 'source', 'uhd']),
    rendition: z.enum([
      '2k',
      '4k',
      '5k',
      '6k',
      '7k',
      '8k',
      '240p',
      '360p',
      '480p',
      '540p',
      '720p',
      '1080p',
      'adaptive',
      'audio',
      'source'
    ]),
    type: z.string().nullable(),
    width: number,
    height: number,
    size: number,
    codec: z.string().nullable(),
    md5: z.string().regex(/^[A-Fa-f0-9]{32}$/),
    created_time: z.string(),
    link: z.string(),
    expires: z.string().optional()
  })
  .passthrough();
const identitySchema = fileSchema.pick({
  quality: true,
  rendition: true,
  type: true,
  width: true,
  height: true,
  size: true,
  codec: true,
  md5: true,
  created_time: true
});
export const referenceSchema = z
  .object({
    videoId: z.string().regex(/^\d+$/),
    viewerUri: z.string().regex(/^\/users\/\d+$/),
    ownerUri: z.string().regex(/^\/users\/\d+$/),
    file: identitySchema
  })
  .strict();
export type FileReference = z.output<typeof referenceSchema>;
export function fileUrl(value: string): string {
  if (
    [...value].some(
      character => character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127
    )
  )
    invalid(
      'Vimeo returned a malformed download link. Request the exact video again.',
      'invalid_file_url'
    );
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return invalid(
      'Vimeo returned an invalid download link. Request the exact video again.',
      'invalid_file_url'
    );
  }
  if (
    url.protocol !== 'https:' ||
    !['player.vimeo.com', 'vimeo.com'].includes(url.hostname) ||
    url.port ||
    url.username ||
    url.password ||
    url.hash
  )
    invalid(
      'Vimeo returned an unsupported download-link origin. Request the exact video again; only native HTTPS Vimeo redirect links are supported.',
      'unsupported_file_url'
    );
  return value;
}
function identity(file: z.output<typeof fileSchema>) {
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      file.created_time
    ) ||
    !Number.isFinite(Date.parse(file.created_time))
  )
    invalid('Vimeo omitted a valid rendition creation timestamp.', 'invalid_response');
  return {
    quality: file.quality,
    rendition: file.rendition,
    type: file.type,
    width: file.width,
    height: file.height,
    size: file.size,
    codec: file.codec,
    md5: file.md5.toLowerCase(),
    created_time: new Date(file.created_time).toISOString()
  };
}
export async function download(
  client: VimeoClient,
  input: { videoId: string; rendition?: string; codec?: string },
  reference?: FileReference
) {
  const viewer = await client.getMe();
  if (reference) exact(viewer.uri, reference.viewerUri, 'original download viewer');
  const video = await client.getDownloadVideo(input.videoId);
  if (reference) exact(video.user.uri, reference.ownerUri, 'original video owner');
  const all = parse(z.array(fileSchema).max(1000), video.download);
  let candidates = all.filter(
    file =>
      file.rendition !== 'adaptive' &&
      file.quality !== 'hls' &&
      (input.rendition === undefined || file.rendition === input.rendition) &&
      (input.codec === undefined || file.codec === input.codec)
  );
  if (reference)
    candidates = candidates.filter(
      file => JSON.stringify(identity(file)) === JSON.stringify(reference.file)
    );
  if (!candidates.length)
    invalid(
      'The requested native downloadable rendition is unavailable or changed. Request the video again; adaptive playlists are not self-contained video files.',
      'download_unavailable'
    );
  if (input.rendition === undefined && !reference) {
    const height = Math.max(...candidates.map(file => file.height));
    candidates = candidates.filter(file => file.height === height);
  }
  if (candidates.length !== 1)
    invalid(
      'More than one downloadable file matches. Select an exact rendition and codec.',
      'ambiguous_rendition'
    );
  const file = candidates[0]!;
  if (
    !file.expires ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      file.expires
    ) ||
    !Number.isFinite(Date.parse(file.expires)) ||
    Date.parse(file.expires) <= Date.now() + 30_000
  )
    invalid(
      'Vimeo did not provide a safely dated downloadable link. Request the exact video again; no expiration is invented.',
      'download_expiry_unavailable'
    );
  const saved: FileReference = {
    videoId: input.videoId,
    viewerUri: viewer.uri,
    ownerUri: video.user.uri,
    file: identity(file)
  };
  const mimeType = file.type?.includes('/') ? file.type : undefined;
  const extension =
    file.type === 'video/mp4' || file.type === 'audio/mp4'
      ? '.mp4'
      : file.type === 'video/webm'
        ? '.webm'
        : '';
  return {
    url: fileUrl(file.link),
    expiresAt: file.expires,
    reference: saved,
    fileName: `${input.videoId}-${file.rendition}${extension}`,
    mimeType,
    approximateSizeBytes: file.size,
    rendition: file.rendition,
    codec: file.codec,
    title: video.name
  };
}
