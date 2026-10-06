import { getFileUrlTool, SlateTool } from 'slates';
import { z } from 'zod';
import { callInputs, exactId, fail } from '../lib/contracts';
import { getMedia, mediaReference, mediaUrl } from '../lib/media';
import { spec } from '../spec';
export const downloadCallMedia = SlateTool.create(spec, {
  key: 'download_call_media',
  name: 'Download Call Media',
  description:
    'Prepare a downloadable existing recording or voicemail MP3 from an exact call. Signed URLs expire after one hour; renewal requires the same authorized call/media identity. No new call or recording is created.',
  tags: { readOnly: true }
})
  .input(z.object({ ...callInputs, kind: z.enum(['recording', 'voicemail']) }))
  .output(
    z.object({
      callIdExact: z.string(),
      kind: z.enum(['recording', 'voicemail']),
      fileName: z.string(),
      mimeType: z.string()
    })
  )
  .handleInvocation(async ctx => {
    const callIdExact = exactId(ctx.input.callId, ctx.input.callIdExact),
      file = await getMedia(ctx.auth, callIdExact, ctx.input.kind);
    await ctx.addAttachment({
      type: 'url',
      url: file.url,
      mimeType: 'audio/mpeg',
      refreshAt: file.expiresAt,
      refreshReference: file.reference
    });
    return {
      output: {
        callIdExact,
        kind: ctx.input.kind,
        fileName: `call-${callIdExact}-${ctx.input.kind}.mp3`,
        mimeType: 'audio/mpeg'
      },
      message:
        'Prepared existing call audio for download. Access remains subject to provider retention and permissions.'
    };
  })
  .build();
export const getFileUrl = getFileUrlTool(spec, async ctx => {
  const parsed = mediaReference.safeParse(ctx.input.reference);
  if (!parsed.success)
    fail('Invalid media reference. Request a new call-media download.', 'aircall_media');
  const old = mediaUrl(ctx.input.url);
  if (old.origin !== parsed.data.origin || old.pathname !== parsed.data.path)
    fail(
      'The original media URL does not match its reference. Request a new download.',
      'aircall_media'
    );
  const file = await getMedia(
    ctx.auth,
    parsed.data.callIdExact,
    parsed.data.kind,
    parsed.data
  );
  return { url: file.url, expiresAt: file.expiresAt, headers: {}, query: {} };
});
