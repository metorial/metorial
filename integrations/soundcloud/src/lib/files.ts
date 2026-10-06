import type { AuthOutput } from './client';
import { fail, guard, identifier, type SoundCloudTrack } from './native';

const MAX_BYTES = 16 * 1024 * 1024;
export async function downloadTrack(track: SoundCloudTrack, auth: AuthOutput) {
  if (track.downloadable !== true || !track.download_url)
    throw fail(
      'This track has no native enabled download. Streaming is not an original-file download.'
    );
  let url: URL;
  try {
    url = new URL(track.download_url);
  } catch {
    throw fail('SoundCloud returned an invalid native download URL.');
  }
  let path: string;
  try {
    path = decodeURIComponent(url.pathname);
  } catch {
    throw fail('SoundCloud returned an invalid encoded download URL.');
  }
  const match = /^\/tracks\/([^/]+)\/download\/?$/.exec(path);
  if (
    url.origin !== 'https://api.soundcloud.com' ||
    url.username ||
    url.password ||
    url.hash ||
    !match ||
    identifier(match[1], 'tracks') !== track.urn
  )
    throw fail(
      'The native download URL must identify this exact track on the HTTPS SoundCloud API. Other download hosts require independently verified provider support.'
    );
  if (
    [...url.searchParams.keys()].some(key =>
      /access_token|oauth_token|authorization|client_secret/i.test(key)
    )
  )
    throw fail(
      'The native download URL contains authentication material. Request the track again.'
    );
  guard(url.href, auth);
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Authorization: `OAuth ${auth.token}` },
      redirect: 'error',
      signal: AbortSignal.timeout(30_000)
    });
  } catch {
    throw fail(
      'SoundCloud download failed or redirected. Request fresh track metadata before retrying.'
    );
  }
  const declared = response.headers.get('content-length');
  const size =
    declared === null ? undefined : /^[0-9]+$/.test(declared) ? Number(declared) : Number.NaN;
  if (
    response.status !== 200 ||
    response.headers.has('content-range') ||
    (size !== undefined && (!Number.isSafeInteger(size) || size > MAX_BYTES)) ||
    !response.body
  ) {
    await response.body?.cancel().catch(() => {});
    throw fail('SoundCloud download failed or exceeds the local 16 MiB delivery bound.');
  }
  const mimeType =
    (response.headers.get('content-type') ?? 'application/octet-stream')
      .split(';')[0]
      ?.trim()
      .toLowerCase() ?? 'application/octet-stream';
  if (
    !mimeType.startsWith('audio/') &&
    !['application/ogg', 'application/octet-stream'].includes(mimeType)
  ) {
    await response.body.cancel().catch(() => {});
    throw fail('SoundCloud returned a non-audio download response.');
  }
  const reader = response.body.getReader(),
    chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      total += result.value.byteLength;
      if (total > MAX_BYTES) {
        await reader.cancel().catch(() => {});
        throw fail('SoundCloud download exceeds the local 16 MiB delivery bound.');
      }
      chunks.push(result.value);
    }
  } catch {
    await reader.cancel().catch(() => {});
    throw fail('SoundCloud download was interrupted or exceeded the local delivery bound.');
  } finally {
    reader.releaseLock();
  }
  if (!total || (size !== undefined && size !== total))
    throw fail('SoundCloud download byte count was incomplete. Request the file again.');
  const content = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    content.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const extension =
    mimeType === 'audio/mpeg'
      ? 'mp3'
      : mimeType === 'audio/wav' || mimeType === 'audio/x-wav'
        ? 'wav'
        : mimeType === 'audio/flac'
          ? 'flac'
          : mimeType.includes('ogg')
            ? 'ogg'
            : 'bin';
  return {
    content,
    mimeType,
    fileName: `soundcloud-track-${track.urn.split(':').at(-1)}.${extension}`,
    size: total
  };
}
