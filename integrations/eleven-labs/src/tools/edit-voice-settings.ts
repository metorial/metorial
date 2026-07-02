import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElevenLabsClient } from '../lib/client';
import { spec } from '../spec';

export let editVoiceSettings = SlateTool.create(spec, {
  name: 'Edit Voice Settings',
  key: 'edit_voice_settings',
  description: `Update the default settings for a specific voice. These settings control how the voice sounds during text-to-speech generation and can be overridden per request.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      voiceId: z.string().describe('ID of the voice to update settings for'),
      stability: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Voice stability (0-1). Lower values add variation between generations.'),
      similarityBoost: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe(
          'Similarity boost (0-1). Higher values make the voice more faithful to the original.'
        ),
      style: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Style exaggeration (0-1). Higher values amplify the voice style.'),
      useSpeakerBoost: z
        .boolean()
        .optional()
        .describe('Enable speaker boost for enhanced clarity'),
      speed: z
        .number()
        .min(0.25)
        .max(4.0)
        .optional()
        .describe('Speed multiplier (0.25-4.0). 1.0 is normal speed.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the settings were updated successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ElevenLabsClient(ctx.auth.token);

    await client.editVoiceSettings(ctx.input.voiceId, {
      stability: ctx.input.stability,
      similarityBoost: ctx.input.similarityBoost,
      style: ctx.input.style,
      useSpeakerBoost: ctx.input.useSpeakerBoost,
      speed: ctx.input.speed
    });

    return {
      output: {
        success: true
      },
      message: `Updated voice settings for \`${ctx.input.voiceId}\`.`
    };
  })
  .build();
