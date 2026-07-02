import { SlateTool } from 'slates';
import { z } from 'zod';
import { HeyGenClient } from '../lib/client';
import { spec } from '../spec';

export let translateVideo = SlateTool.create(spec, {
  name: 'Translate Video',
  key: 'translate_video',
  description: `Translate a video into one or more target languages with natural voice cloning and lip-sync. Submit a video by URL or HeyGen video ID. Translation is asynchronous — use "Get Translation Status" to check progress.`,
  instructions: [
    'Provide either a videoUrl (public URL) or a videoId (HeyGen video ID), not both.',
    'Target languages should be language codes (e.g. "es", "fr", "de", "ja", "zh").'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      videoUrl: z.string().optional().describe('Public URL of the video to translate'),
      videoId: z.string().optional().describe('HeyGen video ID to translate'),
      targetLanguages: z
        .array(z.string())
        .min(1)
        .describe('Target language codes (e.g. ["es", "fr"])'),
      title: z.string().optional().describe('Title for the translation job')
    })
  )
  .output(
    z.object({
      videoTranslateId: z.string().describe('Translation job ID for status polling')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HeyGenClient({ token: ctx.auth.token });

    let result = await client.translateVideo({
      videoUrl: ctx.input.videoUrl,
      videoId: ctx.input.videoId,
      targetLanguages: ctx.input.targetLanguages,
      title: ctx.input.title
    });

    return {
      output: result,
      message: `Video translation started for ${ctx.input.targetLanguages.length} language(s): ${ctx.input.targetLanguages.join(', ')}. Translation ID: **${result.videoTranslateId}**. Use "Get Translation Status" to check progress.`
    };
  })
  .build();
