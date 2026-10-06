import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwitchClient } from '../lib/client';
import { requireValue, upstream, validateInput } from '../lib/contracts';
import { spec } from '../spec';

export async function clipContent(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw upstream(undefined, 'validate clip download URL');
  }
  requireValue(
    url.protocol === 'https:' &&
      (url.hostname === 'clips.twitchcdn.net' ||
        url.hostname.endsWith('.clips.twitchcdn.net')) &&
      !url.username &&
      !url.password &&
      !url.port &&
      !url.hash,
    'Twitch returned an unsupported clip download origin.'
  );
  const maximum = 64 * 1024 * 1024;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    // Signed CDN URLs are capability URLs; never forward the Twitch access token.
    const response = await fetch(url, { redirect: 'error', signal: controller.signal });
    requireValue(
      response.status === 200 && response.body,
      'Twitch clip content is unavailable. Request a fresh download.'
    );
    const length = response.headers.get('content-length');
    if (length !== null)
      requireValue(
        /^\d+$/.test(length) && Number(length) <= maximum,
        'The clip exceeds the 64 MiB download limit.'
      );
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.byteLength;
        requireValue(size <= maximum, 'The clip exceeds the 64 MiB download limit.');
        chunks.push(part.value);
      }
    } finally {
      await reader.cancel();
    }
    const bytes = Buffer.concat(chunks, size);
    requireValue(
      bytes.length >= 12 && bytes.toString('ascii', 4, 8) === 'ftyp',
      'The downloaded clip is not a supported MP4 file.'
    );
    return bytes;
  } catch (error) {
    throw upstream(error, 'download clip');
  } finally {
    controller.abort();
    clearTimeout(timer);
  }
}
export let downloadClip = SlateTool.create(spec, {
  name: 'Download Clip',
  key: 'download_clip',
  description: 'Download an exact clip as a landscape or portrait MP4 file.',
  instructions: [
    'Discover clipId and broadcasterId with manage_clips. The requested rendition must exist.',
    'User tokens need channel:manage:clips or editor:manage:clips. App tokens require the native broadcaster/editor permission and an explicit editorId.'
  ],
  constraints: [
    'Downloads are limited to 64 MiB. Temporary provider URLs are consumed immediately; no expiry time is assumed.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      broadcasterId: z.string(),
      clipId: z.string(),
      editorId: z.string().optional(),
      orientation: z.enum(['landscape', 'portrait']).default('landscape')
    })
  )
  .output(
    z.object({
      clipId: z.string(),
      broadcasterId: z.string(),
      orientation: z.enum(['landscape', 'portrait']),
      fileName: z.string(),
      mimeType: z.literal('video/mp4'),
      sizeBytes: z.number(),
      permalink: z.string()
    })
  )
  .handleInvocation(async ctx => {
    validateInput('download_clip', ctx.input, [ctx.auth.token]);
    const result = await new TwitchClient(
      ctx.auth.token,
      ctx.auth.clientId,
      ctx.auth.userId
    ).getClipDownload(ctx.input.broadcasterId, ctx.input.clipId, ctx.input.editorId);
    const url =
      ctx.input.orientation === 'portrait'
        ? result.download.portrait_download_url
        : result.download.landscape_download_url;
    requireValue(url, 'This clip has no downloadable rendition in the requested orientation.');
    const bytes = await clipContent(url);
    const fileName = `${ctx.input.clipId}-${ctx.input.orientation}.mp4`;
    await ctx.addAttachment({
      type: 'content',
      content: new Response(new Uint8Array(bytes), {
        headers: { 'content-type': 'video/mp4' }
      }),
      filename: fileName,
      mimeType: 'video/mp4'
    });
    return {
      output: {
        clipId: ctx.input.clipId,
        broadcasterId: ctx.input.broadcasterId,
        orientation: ctx.input.orientation,
        fileName,
        mimeType: 'video/mp4' as const,
        sizeBytes: bytes.length,
        permalink: result.clip.url
      },
      message: 'Clip MP4 ready to download.'
    };
  })
  .build();
