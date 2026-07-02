import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let transcriptChunkSchema = z.object({
  text: z.string().describe('Transcript text segment'),
  offset: z.number().describe('Start time offset in milliseconds'),
  duration: z.number().describe('Duration of segment in milliseconds'),
  lang: z.string().optional().describe('Language code of the segment')
});

export let translateYouTubeTranscript = SlateTool.create(spec, {
  name: 'Translate YouTube Transcript',
  key: 'translate_youtube_transcript',
  description: `Fetch and translate the transcript of a YouTube video into a target language.
This is specific to YouTube and uses YouTube's built-in translation capabilities.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      videoId: z.string().describe('YouTube video ID'),
      targetLang: z
        .string()
        .describe('Target language code (ISO 639-1, e.g. "es", "fr", "de")'),
      text: z
        .boolean()
        .optional()
        .describe('If true, return plain text instead of timestamped chunks')
    })
  )
  .output(
    z.object({
      content: z
        .union([z.array(transcriptChunkSchema), z.string()])
        .optional()
        .describe('Translated transcript content'),
      lang: z.string().optional().describe('Language of the returned transcript')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.translateYouTubeTranscript({
      videoId: ctx.input.videoId,
      lang: ctx.input.targetLang,
      text: ctx.input.text
    });

    let contentSummary =
      typeof result.content === 'string'
        ? `${result.content.length} characters`
        : `${(result.content as any[])?.length ?? 0} segments`;

    return {
      output: {
        content: result.content,
        lang: result.lang
      },
      message: `Transcript translated to **${ctx.input.targetLang}** (${contentSummary}).`
    };
  })
  .build();
