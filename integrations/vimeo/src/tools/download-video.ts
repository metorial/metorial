import { getFileUrlTool, SlateTool } from 'slates';
import { z } from 'zod';
import { VimeoClient } from '../lib/client';
import { download, referenceSchema } from '../lib/files';
import { parse } from '../lib/native';
import { spec } from '../spec';

export const downloadVideoTool = SlateTool.create(spec, {
  name: 'Download Video',
  key: 'download_video',
  description:
    'Prepare an authorized native downloadable video rendition. Requires an eligible Vimeo membership and public, private and video_files scopes. Native redirect links expire; this does not upload, transcode or change video privacy.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      videoId: z.string().describe('Native video ID from list_videos or get_video'),
      rendition: z
        .string()
        .optional()
        .describe(
          'Exact native rendition, such as 1080p or source. When omitted, select the uniquely matching highest-resolution downloadable file'
        ),
      codec: z
        .string()
        .optional()
        .describe(
          'Native codec selector such as H264, HEVC or AV1 when a rendition is ambiguous'
        )
    })
  )
  .output(
    z.object({
      videoId: z.string(),
      fileName: z.string(),
      mimeType: z.string().optional(),
      approximateSizeBytes: z.number(),
      rendition: z.string(),
      codec: z.string().nullable(),
      expiresAt: z.string()
    })
  )
  .handleInvocation(async ctx => {
    const file = await download(new VimeoClient(ctx.auth.token), ctx.input);
    await ctx.addAttachment({
      type: 'url',
      url: file.url,
      filename: file.fileName,
      mimeType: file.mimeType,
      refreshReference: file.reference,
      refreshAt: file.expiresAt
    });
    return {
      output: {
        videoId: ctx.input.videoId,
        fileName: file.fileName,
        mimeType: file.mimeType,
        approximateSizeBytes: file.approximateSizeBytes,
        rendition: file.rendition,
        codec: file.codec,
        expiresAt: file.expiresAt
      },
      message: `Prepared **${file.title}** (${file.rendition}) for download. Native file links may redirect to Vimeo's CDN.`
    };
  })
  .build();
export const renewVideoFile = getFileUrlTool(spec, async ctx => {
  const reference = parse(referenceSchema, ctx.input.reference);
  const file = await download(
    new VimeoClient(ctx.auth.token),
    { videoId: reference.videoId },
    reference
  );
  return { url: file.url, expiresAt: file.expiresAt, headers: {}, query: {} };
});
