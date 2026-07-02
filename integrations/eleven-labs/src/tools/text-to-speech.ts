import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElevenLabsClient } from '../lib/client';
import { spec } from '../spec';

export let textToSpeech = SlateTool.create(spec, {
  name: 'Text to Speech',
  key: 'text_to_speech',
  description: `Convert text into lifelike speech audio using ElevenLabs voices and models. Returns base64-encoded audio that can be saved or played back. Supports multiple languages, voice customization, and various output formats.`,
  instructions: [
    'Use the "listVoices" or "listModels" tools first to find available voice IDs and model IDs.',
    'The default model is "eleven_multilingual_v2". Use "eleven_flash_v2_5" for lower latency.'
  ],
  constraints: ['Maximum text length depends on your subscription tier and the model used.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      voiceId: z.string().describe('ID of the voice to use for speech generation'),
      text: z.string().describe('The text to convert into speech'),
      modelId: z
        .string()
        .optional()
        .describe(
          'Model ID to use. Defaults to "eleven_multilingual_v2". Use "eleven_flash_v2_5" for low latency.'
        ),
      languageCode: z
        .string()
        .optional()
        .describe('ISO 639-1 language code to enforce for the model'),
      outputFormat: z
        .string()
        .optional()
        .describe(
          'Audio output format, e.g. "mp3_44100_128", "pcm_16000", "ulaw_8000". Defaults to mp3.'
        ),
      seed: z.number().optional().describe('Seed for deterministic generation (0-4294967295)'),
      applyTextNormalization: z
        .enum(['auto', 'on', 'off'])
        .optional()
        .describe('Text normalization mode. Defaults to "auto".'),
      voiceSettings: z
        .object({
          stability: z
            .number()
            .min(0)
            .max(1)
            .optional()
            .describe('Voice stability (0-1). Lower values add more variability.'),
          similarityBoost: z
            .number()
            .min(0)
            .max(1)
            .optional()
            .describe(
              'Similarity boost (0-1). Higher values are more faithful to the original voice.'
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
        .optional()
        .describe('Voice settings overrides for this request')
    })
  )
  .output(
    z.object({
      audioBase64: z.string().describe('Base64-encoded audio data'),
      contentType: z.string().describe('MIME type of the audio (e.g. audio/mpeg)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ElevenLabsClient(ctx.auth.token);

    let result = await client.textToSpeech(ctx.input.voiceId, {
      text: ctx.input.text,
      modelId: ctx.input.modelId,
      languageCode: ctx.input.languageCode,
      outputFormat: ctx.input.outputFormat,
      seed: ctx.input.seed,
      applyTextNormalization: ctx.input.applyTextNormalization,
      voiceSettings: ctx.input.voiceSettings
        ? {
            stability: ctx.input.voiceSettings.stability,
            similarityBoost: ctx.input.voiceSettings.similarityBoost,
            style: ctx.input.voiceSettings.style,
            useSpeakerBoost: ctx.input.voiceSettings.useSpeakerBoost,
            speed: ctx.input.voiceSettings.speed
          }
        : undefined
    });

    let textPreview =
      ctx.input.text.length > 80 ? `${ctx.input.text.slice(0, 80)}...` : ctx.input.text;

    return {
      output: result,
      message: `Generated speech audio for: "${textPreview}" using voice \`${ctx.input.voiceId}\` (model: ${ctx.input.modelId || 'eleven_multilingual_v2'}).`
    };
  })
  .build();
