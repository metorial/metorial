import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let downloadTranscriptionMedia = SlateTool.create(spec, {
  key: 'download_transcription_media',
  name: 'Download Transcription Media',
  description:
    'Download the existing transcoded MP3 audio or MP4 video for a transcription. Media must be ready and served by the documented media.happyscribe.com host. Does not create a transcription or a new export.',
  tags: { readOnly: true }
})
  .input(z.object({ transcriptionId: z.string(), media: z.enum(['audio', 'video']) }))
  .output(
    z.object({
      transcriptionId: z.string(),
      filename: z.string(),
      mimeType: z.string(),
      byteLength: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let result = await client.getTranscription(ctx.input.transcriptionId);
    let url = ctx.input.media === 'audio' ? result.audioUrl : result.videoUrl;
    if (typeof url !== 'string' || !url) {
      throw createApiServiceError(
        'This transcription has no ready media download of the requested type.'
      );
    }
    let file = await client.downloadFile(url, ctx.input.media === 'audio' ? 'mp3' : 'mp4');
    let filename = `transcription-${result.id}.${file.extension}`;
    await ctx.addAttachment({
      type: 'content',
      content: new Response(file.bytes, { headers: { 'Content-Type': file.mimeType } }),
      filename,
      mimeType: file.mimeType
    });
    return {
      output: {
        transcriptionId: result.id,
        filename,
        mimeType: file.mimeType,
        byteLength: file.bytes.length
      },
      message: `Prepared transcription **${result.id}** ${ctx.input.media} for download.`
    };
  })
  .build();
