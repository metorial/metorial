import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElevenLabsClient } from '../lib/client';
import { spec } from '../spec';
import {
  audioAttachment,
  audioOutput,
  audioOutputSchema,
  voiceSettingsSchema
} from './shared';

export let textToSpeech = SlateTool.create(spec, {
  name: 'Text to Speech',
  key: 'text_to_speech',
  description: `Convert text into lifelike speech audio using ElevenLabs voices and models. Returns generated audio as a Slate attachment. Supports multiple languages, voice customization, and various output formats.`,
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
      previousText: z
        .string()
        .optional()
        .describe('Text immediately before this request, for continuity across chunks'),
      nextText: z
        .string()
        .optional()
        .describe('Text immediately after this request, for continuity across chunks'),
      pronunciationDictionaryLocators: z
        .array(
          z.object({
            pronunciationDictionaryId: z.string().describe('Pronunciation dictionary ID'),
            versionId: z.string().describe('Pronunciation dictionary version ID')
          })
        )
        .max(3)
        .optional()
        .describe('Up to 3 pronunciation dictionary locators to apply in order'),
      voiceSettings: voiceSettingsSchema
        .optional()
        .describe('Voice settings overrides for this request')
    })
  )
  .output(audioOutputSchema)
  .handleInvocation(async ctx => {
    let client = new ElevenLabsClient(ctx.auth.token);

    let result = await client.textToSpeech(ctx.input.voiceId, {
      text: ctx.input.text,
      modelId: ctx.input.modelId,
      languageCode: ctx.input.languageCode,
      outputFormat: ctx.input.outputFormat,
      seed: ctx.input.seed,
      previousText: ctx.input.previousText,
      nextText: ctx.input.nextText,
      applyTextNormalization: ctx.input.applyTextNormalization,
      pronunciationDictionaryLocators: ctx.input.pronunciationDictionaryLocators,
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
      output: audioOutput(result),
      attachments: [audioAttachment(result)],
      message: `Generated speech audio for: "${textPreview}" using voice \`${ctx.input.voiceId}\` (model: ${ctx.input.modelId || 'eleven_multilingual_v2'}).`
    };
  })
  .build();
