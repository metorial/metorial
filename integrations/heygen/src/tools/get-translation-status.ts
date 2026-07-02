import { SlateTool } from 'slates';
import { z } from 'zod';
import { HeyGenClient } from '../lib/client';
import { spec } from '../spec';

export let getTranslationStatus = SlateTool.create(spec, {
  name: 'Get Translation Status',
  key: 'get_translation_status',
  description: `Check the status of a video translation job and retrieve translated video URLs. Returns per-language translation status and video URLs once complete.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      videoTranslateId: z
        .string()
        .describe('Translation job ID returned from a translate request')
    })
  )
  .output(
    z.object({
      videoTranslateId: z.string().describe('Translation job ID'),
      status: z.string().describe('Overall translation status'),
      targetLanguages: z
        .array(
          z.object({
            language: z.string().describe('Target language code'),
            videoUrl: z.string().nullable().describe('URL of the translated video'),
            status: z.string().describe('Translation status for this language')
          })
        )
        .describe('Per-language translation results'),
      error: z.string().nullable().describe('Error message if translation failed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HeyGenClient({ token: ctx.auth.token });

    let result = await client.getTranslationStatus(ctx.input.videoTranslateId);

    let completed = result.targetLanguages.filter(l => l.status === 'completed');

    return {
      output: result,
      message:
        result.status === 'completed'
          ? `Translation **${result.videoTranslateId}** is **complete**. ${completed.length} language(s) ready.`
          : result.status === 'failed'
            ? `Translation **${result.videoTranslateId}** **failed**: ${result.error || 'Unknown error'}`
            : `Translation **${result.videoTranslateId}** is **${result.status}**. ${completed.length}/${result.targetLanguages.length} language(s) complete.`
    };
  })
  .build();
