import { Buffer } from 'node:buffer';
import { createTextAttachment, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSubtitles = SlateTool.create(spec, {
  name: 'Get Subtitles',
  key: 'get_subtitles',
  description: `Export a completed transcript as SRT or VTT subtitle format for use with video players for subtitles and closed captions.
Optionally limit the number of characters per caption line.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      transcriptId: z.string().describe('The unique transcript ID.'),
      subtitleFormat: z.enum(['srt', 'vtt']).describe('Subtitle format: SRT or VTT.'),
      charsPerCaption: z
        .number()
        .optional()
        .describe('Maximum characters per subtitle caption line.')
    })
  )
  .output(
    z.object({
      format: z.string().describe('The subtitle format (srt or vtt).'),
      contentType: z.string().describe('MIME type of the returned subtitle attachment.'),
      byteLength: z.number().describe('UTF-8 byte length of the subtitle attachment.'),
      attachmentCount: z.number().describe('Number of subtitle attachments returned.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.getSubtitles(
      ctx.input.transcriptId,
      ctx.input.subtitleFormat,
      ctx.input.charsPerCaption
    );

    let content = typeof result === 'string' ? result : JSON.stringify(result);
    let contentType = ctx.input.subtitleFormat === 'srt' ? 'application/x-subrip' : 'text/vtt';

    return {
      output: {
        format: ctx.input.subtitleFormat,
        contentType,
        byteLength: Buffer.byteLength(content, 'utf8'),
        attachmentCount: 1
      },
      attachments: [createTextAttachment(content, contentType)],
      message: `Generated **${ctx.input.subtitleFormat.toUpperCase()}** subtitles for transcript **${ctx.input.transcriptId}**.`
    };
  })
  .build();
