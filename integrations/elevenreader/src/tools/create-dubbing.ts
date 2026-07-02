import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElevenLabsClient } from '../lib/client';
import { spec } from '../spec';

export let createDubbingTool = SlateTool.create(spec, {
  name: 'Create Dubbing',
  key: 'create_dubbing',
  description: `Dub audio or video content into another language. Provide a source URL, target language, and optional configuration. Returns a dubbing project ID that can be polled for completion.`,
  instructions: [
    'Use ISO 639-1 or ISO 639-3 language codes for source and target languages.',
    'Set sourceLang to "auto" for automatic detection.',
    'After creating, use Get Dubbing to check status and retrieve the result.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      sourceUrl: z.string().describe('URL of the source audio or video file to dub'),
      targetLang: z.string().describe('Target language code (ISO 639-1/3) to dub into'),
      sourceLang: z
        .string()
        .optional()
        .describe('Source language code. Defaults to "auto" for automatic detection'),
      name: z.string().optional().describe('Name for the dubbing project'),
      numSpeakers: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('Number of speakers (0 for auto-detect)'),
      dropBackgroundAudio: z
        .boolean()
        .optional()
        .describe('Remove background audio from the dubbed output'),
      disableVoiceCloning: z
        .boolean()
        .optional()
        .describe('Use library voices instead of cloning original speakers'),
      watermark: z.boolean().optional().describe('Apply watermark to the output'),
      highestResolution: z
        .boolean()
        .optional()
        .describe('Use the highest resolution processing')
    })
  )
  .output(
    z.object({
      dubbingId: z.string().describe('ID of the created dubbing project'),
      expectedDurationSec: z.number().describe('Estimated processing duration in seconds')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ElevenLabsClient(ctx.auth.token);

    let result = await client.createDubbing({
      sourceUrl: ctx.input.sourceUrl,
      targetLang: ctx.input.targetLang,
      sourceLang: ctx.input.sourceLang,
      name: ctx.input.name,
      numSpeakers: ctx.input.numSpeakers,
      dropBackgroundAudio: ctx.input.dropBackgroundAudio,
      disableVoiceCloning: ctx.input.disableVoiceCloning,
      watermark: ctx.input.watermark,
      highestResolution: ctx.input.highestResolution
    });

    return {
      output: result,
      message: `Created dubbing project \`${result.dubbingId}\` targeting language **${ctx.input.targetLang}**. Estimated duration: ${result.expectedDurationSec}s.`
    };
  })
  .build();
