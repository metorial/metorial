import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElevenLabsClient } from '../lib/client';
import { spec } from '../spec';

let modelSchema = z.object({
  modelId: z.string().describe('Unique model identifier'),
  name: z.string().optional().describe('Model display name'),
  description: z.string().optional().describe('Model description'),
  canDoTextToSpeech: z
    .boolean()
    .optional()
    .describe('Whether the model supports text-to-speech'),
  canDoVoiceConversion: z
    .boolean()
    .optional()
    .describe('Whether the model supports voice conversion'),
  canUseStyle: z.boolean().optional().describe('Whether the model supports style control'),
  canUseSpeakerBoost: z
    .boolean()
    .optional()
    .describe('Whether the model supports speaker boost'),
  tokenCostFactor: z
    .number()
    .optional()
    .describe('Cost multiplier relative to the base model'),
  languages: z
    .array(
      z.object({
        languageId: z.string().optional(),
        name: z.string().optional()
      })
    )
    .optional()
    .describe('Supported languages')
});

export let listModels = SlateTool.create(spec, {
  name: 'List Models',
  key: 'list_models',
  description: `List all available ElevenLabs AI models with their capabilities. Use this to find the right model ID for text-to-speech, voice conversion, or other operations.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      models: z.array(modelSchema).describe('List of available models')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ElevenLabsClient(ctx.auth.token);
    let result = await client.listModels();
    let rawModels = (Array.isArray(result) ? result : []) as Record<string, unknown>[];

    let models = rawModels.map(m => {
      let langs = (m.languages || []) as Record<string, unknown>[];
      return {
        modelId: m.model_id as string,
        name: (m.name as string | null) ?? undefined,
        description: m.description as string | undefined,
        canDoTextToSpeech: (m.can_do_text_to_speech as boolean | null) ?? undefined,
        canDoVoiceConversion: (m.can_do_voice_conversion as boolean | null) ?? undefined,
        canUseStyle: (m.can_use_style as boolean | null) ?? undefined,
        canUseSpeakerBoost: (m.can_use_speaker_boost as boolean | null) ?? undefined,
        tokenCostFactor: m.token_cost_factor as number | undefined,
        languages: langs.map(l => ({
          languageId: l.language_id as string | undefined,
          name: l.name as string | undefined
        }))
      };
    });

    return {
      output: { models },
      message: `Found ${models.length} available model(s).`
    };
  })
  .build();
