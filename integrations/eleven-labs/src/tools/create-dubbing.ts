import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElevenLabsClient } from '../lib/client';
import { spec } from '../spec';

export let createDubbing = SlateTool.create(spec, {
  name: 'Create Dubbing',
  key: 'create_dubbing',
  description: `Start a dubbing job to translate and voice-over audio/video content into another language. Provide a source URL and target language to begin. Returns the dubbing project ID for tracking progress.`,
  instructions: [
    'Use the "getDubbing" tool to check the status of a dubbing job.',
    'For best results, limit to 9 or fewer unique speakers.'
  ],
  constraints: [
    'Files up to 1GB and 2.5 hours are supported.',
    'Requires a Creator plan or higher.',
    'This is a batch operation - processing time depends on content length.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      sourceUrl: z.string().describe('URL of the source audio/video file to dub'),
      targetLang: z.string().describe('Target language code (ISO 639-1 or ISO 639-3)'),
      sourceLang: z
        .string()
        .optional()
        .describe('Source language code. Defaults to auto-detection.'),
      name: z.string().optional().describe('Name for the dubbing project'),
      numSpeakers: z
        .number()
        .optional()
        .describe('Number of speakers (0 for auto-detection, recommended max 9)'),
      watermark: z.boolean().optional().describe('Apply a watermark to the output video'),
      highestResolution: z
        .boolean()
        .optional()
        .describe('Use the highest resolution available')
    })
  )
  .output(
    z.object({
      dubbingId: z.string().describe('ID of the created dubbing project')
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
      watermark: ctx.input.watermark,
      highestResolution: ctx.input.highestResolution
    });

    let data = result as Record<string, unknown>;

    return {
      output: {
        dubbingId: data.dubbing_id as string
      },
      message: `Created dubbing project \`${data.dubbing_id}\` — translating to **${ctx.input.targetLang}**${ctx.input.name ? ` ("${ctx.input.name}")` : ''}.`
    };
  })
  .build();
