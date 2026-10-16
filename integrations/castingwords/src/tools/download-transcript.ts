import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, transcriptFormats, transcriptMimeTypes } from '../lib/client';
import { spec } from '../spec';

export const downloadTranscript = SlateTool.create(spec, {
  name: 'Download Transcript',
  key: 'download_transcript',
  description:
    'Prepare a completed transcript for download as TXT, DOC, RTF, HTML, DOCX, timestamped text, SRT, or VTT. Caption and timestamp formats require the corresponding service to have been ordered.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      audiofileId: z
        .number()
        .describe('Audiofile ID returned by order_transcription or a completion notification'),
      format: z
        .enum(transcriptFormats)
        .default('txt')
        .describe('Transcript or caption file format'),
      test: z
        .boolean()
        .optional()
        .describe('Request the provider sample transcript instead of a real transcript')
    })
  )
  .output(
    z.object({
      audiofileId: z.number().describe('Audiofile ID'),
      format: z.string().describe('Requested transcript format'),
      mimeType: z.string().describe('File MIME type')
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client(ctx.auth.token);
    await ctx.addAttachment(
      client.getTranscriptDownload(ctx.input.audiofileId, ctx.input.format, ctx.input.test)
    );
    return {
      output: {
        audiofileId: ctx.input.audiofileId,
        format: ctx.input.format,
        mimeType: transcriptMimeTypes[ctx.input.format]
      },
      message: `Prepared the ${ctx.input.format.toUpperCase()} transcript download for audiofile **${ctx.input.audiofileId}**. Availability is checked when downloaded.`
    };
  })
  .build();
