import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElevenLabsClient } from '../lib/client';
import { spec } from '../spec';

export let getVoiceTool = SlateTool.create(spec, {
  name: 'Get Voice',
  key: 'get_voice',
  description: `Get detailed metadata for a specific voice, including its settings, category, labels, fine-tuning status, and preview URL.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      voiceId: z.string().describe('Voice ID. Call list_voices to discover available voices.')
    })
  )
  .output(
    z.object({
      raw: z.unknown().optional().describe('Complete provider response'),
      voiceId: z.string().describe('Unique voice identifier'),
      name: z.string().describe('Display name of the voice'),
      category: z
        .string()
        .optional()
        .describe('Voice category (premade, cloned, generated, professional)'),
      description: z.string().optional().describe('Voice description'),
      previewUrl: z.string().optional().describe('URL to preview the voice audio'),
      labels: z
        .record(z.string(), z.string())
        .optional()
        .describe('Labels/tags associated with the voice'),
      settings: z
        .object({
          stability: z.number().optional(),
          similarityBoost: z.number().optional(),
          style: z.number().optional(),
          useSpeakerBoost: z.boolean().optional(),
          speed: z.number().optional()
        })
        .optional()
        .describe('Default voice settings'),
      fineTuning: z
        .object({
          isAllowedToFineTune: z.boolean().optional(),
          state: z.record(z.string(), z.string()).optional()
        })
        .optional()
        .describe('Fine-tuning status and state'),
      createdAtUnix: z
        .number()
        .optional()
        .describe('Unix timestamp of when the voice was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ElevenLabsClient(ctx.auth.token);

    let v = await client.getVoice(ctx.input.voiceId);

    return {
      output: {
        raw: v.raw,
        voiceId: v.voice_id,
        name: v.name,
        category: v.category ?? undefined,
        description: v.description ?? undefined,
        previewUrl: v.preview_url ?? undefined,
        labels: v.labels ?? undefined,
        settings: v.settings
          ? {
              stability: v.settings.stability ?? undefined,
              similarityBoost: v.settings.similarity_boost ?? undefined,
              style: v.settings.style ?? undefined,
              useSpeakerBoost: v.settings.use_speaker_boost ?? undefined,
              speed: v.settings.speed ?? undefined
            }
          : undefined,
        fineTuning: v.fine_tuning
          ? {
              isAllowedToFineTune: v.fine_tuning.is_allowed_to_fine_tune ?? undefined,
              state: v.fine_tuning.state ?? undefined
            }
          : undefined,
        createdAtUnix: v.created_at_unix ?? undefined
      },
      message: `Voice **${v.name}** (\`${v.voice_id}\`), category: ${v.category || 'unknown'}.`
    };
  })
  .build();
