import { SlateTool } from 'slates';
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
      subtitleContent: z.string().describe('The subtitle content in the requested format.'),
      format: z.string().describe('The subtitle format (srt or vtt).')
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

    return {
      output: {
        subtitleContent: content,
        format: ctx.input.subtitleFormat
      },
      message: `Generated **${ctx.input.subtitleFormat.toUpperCase()}** subtitles for transcript **${ctx.input.transcriptId}**.`
    };
  })
  .build();
