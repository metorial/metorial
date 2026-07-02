import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElevenLabsClient } from '../lib/client';
import { spec } from '../spec';

export let listModelsTool = SlateTool.create(spec, {
  name: 'List Models',
  key: 'list_models',
  description: `List all available ElevenLabs models with their capabilities. Useful for discovering which models support text-to-speech, voice conversion, and other features.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      models: z
        .array(
          z.object({
            modelId: z.string().describe('Unique model identifier'),
            name: z.string().describe('Display name of the model'),
            description: z.string().optional().describe('Model description'),
            canDoTextToSpeech: z
              .boolean()
              .optional()
              .describe('Whether the model supports text-to-speech'),
            canDoVoiceConversion: z
              .boolean()
              .optional()
              .describe('Whether the model supports voice conversion'),
            canBeFineTuned: z
              .boolean()
              .optional()
              .describe('Whether the model can be fine-tuned'),
            canUseStyle: z
              .boolean()
              .optional()
              .describe('Whether the model supports style parameter'),
            canUseSpeakerBoost: z
              .boolean()
              .optional()
              .describe('Whether the model supports speaker boost'),
            tokenCostFactor: z.number().optional().describe('Cost multiplier for this model'),
            languages: z
              .array(
                z.object({
                  languageId: z.string().describe('Language identifier'),
                  name: z.string().describe('Language name')
                })
              )
              .optional()
              .describe('Supported languages')
          })
        )
        .describe('Available models')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ElevenLabsClient(ctx.auth.token);

    let models = await client.listModels();

    let mapped = models.map((m: any) => ({
      modelId: m.model_id,
      name: m.name,
      description: m.description,
      canDoTextToSpeech: m.can_do_text_to_speech,
      canDoVoiceConversion: m.can_do_voice_conversion,
      canBeFineTuned: m.can_be_finetuned,
      canUseStyle: m.can_use_style,
      canUseSpeakerBoost: m.can_use_speaker_boost,
      tokenCostFactor: m.token_cost_factor,
      languages: m.languages?.map((l: any) => ({
        languageId: l.language_id,
        name: l.name
      }))
    }));

    return {
      output: { models: mapped },
      message: `Found ${mapped.length} available models.`
    };
  })
  .build();
