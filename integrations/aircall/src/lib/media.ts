import { createHash } from 'node:crypto';
import type { AircallAuth } from './client';
import { Client } from './client';
import { exactId, fail, id, integer, nativeCallId, row, text, z } from './contracts';
export const mediaReference = z.object({
  authHash: z.string(),
  callIdExact: z.string(),
  sid: z.string(),
  startedAt: z.number(),
  numberId: z.number(),
  kind: z.enum(['recording', 'voicemail']),
  origin: z.string(),
  path: z.string()
});
export const authHash = (auth: AircallAuth) =>
  createHash('sha256')
    .update(JSON.stringify({ token: auth.token, authType: auth.authType, apiId: auth.apiId }))
    .digest('hex');
export const mediaUrl = (value: unknown): URL => {
  let url: URL;
  try {
    url = new URL(text(value, 'Native media URL'));
  } catch {
    return fail(
      'Aircall did not return a usable direct media URL. Request the native call again.',
      'aircall_media'
    );
  }
  if (
    url.protocol !== 'https:' ||
    url.hostname !== 'aircall.s3.us-west-2.amazonaws.com' ||
    url.port ||
    url.username ||
    url.password ||
    url.hash ||
    !url.pathname.endsWith('.mp3') ||
    !url.search
  )
    fail(
      'Aircall returned an unsupported direct media location. Only the documented signed MP3 storage host is accepted; use the native call view for other locations.',
      'aircall_media'
    );
  return url;
};
export async function getMedia(
  auth: AircallAuth,
  callIdExact: string,
  kind: 'recording' | 'voicemail',
  reference?: z.infer<typeof mediaReference>
) {
  if (reference && reference.authHash !== authHash(auth))
    fail('The original authorization changed. Request a new media download.', 'aircall_media');
  const call = await new Client(auth).getCall(exactId(undefined, callIdExact));
  const current = {
    authHash: authHash(auth),
    callIdExact: nativeCallId(call.id),
    sid: text(call.sid, 'Native call SID'),
    startedAt: integer(call.started_at, 'Native call start'),
    numberId: id(row(call.number).id),
    kind
  };
  if (
    reference &&
    Object.entries(current).some(
      ([key, value]) => reference[key as keyof typeof current] !== value
    )
  )
    fail(
      'The original call identity or authorization changed. Request a new media download.',
      'aircall_media'
    );
  if (call[kind] == null)
    fail(
      'This call has no available media of the requested kind. Assets may arrive up to 24 hours after a call; request again when available.',
      'aircall_media'
    );
  const url = mediaUrl(call[kind]);
  if (reference && (url.origin !== reference.origin || url.pathname !== reference.path))
    fail('The original media resource changed. Request a new download.', 'aircall_media');
  let expires = Date.now() + 55 * 60 * 1000;
  const nativeExpires = url.searchParams.get('Expires');
  if (nativeExpires !== null) {
    if (!/^\d+$/.test(nativeExpires)) fail('Invalid native media expiry.', 'aircall_media');
    expires = Math.min(
      expires,
      integer(Number(nativeExpires), 'Native media expiry') * 1000 - 60000
    );
  }
  const signedDate = url.searchParams.get('X-Amz-Date'),
    signedSeconds = url.searchParams.get('X-Amz-Expires');
  if (signedDate !== null || signedSeconds !== null) {
    if (
      !signedDate ||
      !/^\d{8}T\d{6}Z$/.test(signedDate) ||
      !signedSeconds ||
      !/^\d+$/.test(signedSeconds)
    )
      fail('Invalid native signed media expiry.', 'aircall_media');
    const time = Date.parse(
      `${signedDate.slice(0, 4)}-${signedDate.slice(4, 6)}-${signedDate.slice(6, 8)}T${signedDate.slice(9, 11)}:${signedDate.slice(11, 13)}:${signedDate.slice(13, 15)}Z`
    );
    if (!Number.isFinite(time)) fail('Invalid native signing date.', 'aircall_media');
    expires = Math.min(
      expires,
      time + integer(Number(signedSeconds), 'Native signed duration', 1, 604800) * 1000 - 60000
    );
  }
  if (expires <= Date.now())
    fail(
      'The native signed URL is already expired or too close to expiry. Request the call again.',
      'aircall_media'
    );
  return {
    url: url.toString(),
    expiresAt: new Date(expires).toISOString(),
    reference: { ...current, origin: url.origin, path: url.pathname }
  };
}
