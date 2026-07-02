import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElevenLabsClient } from '../lib/client';
import { spec } from '../spec';

export let textToSpeechTool = SlateTool.create(spec, {
  name: 'Text to Speech',
  key: 'text_to_speech',
  description: `Convert text into lifelike audio using AI voices. Returns base64-encoded audio data. Supports multiple models (Flash, Turbo, Multilingual v2, v3), various output formats (MP3, PCM, opus, ulaw), and fine-grained voice settings for stability, similarity, style, and speed.`,
  instructions: [
    'Use the "eleven_multilingual_v2" model for high-quality multilingual speech. Use "eleven_flash_v2_5" for low-latency real-time applications.',
    'Voice settings: stability (0-1), similarityBoost (0-1), style (0-1), speed (0.25-4.0).'
  ],
  constraints: [
    'Maximum 3 pronunciation dictionary locators per request.',
    'MP3 192kbps requires Creator tier+. PCM/WAV 44.1kHz require Pro tier+.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      voiceId: z.string().describe('ID of the voice to use for speech generation'),
      text: z.string().describe('The text content to convert to speech'),
      modelId: z
        .string()
        .optional()
        .describe(
          'Model ID to use (e.g. "eleven_multilingual_v2", "eleven_flash_v2_5", "eleven_turbo_v2_5"). Defaults to "eleven_multilingual_v2"'
        ),
      languageCode: z
        .string()
        .optional()
        .describe('ISO 639-1 language code to enforce a specific language'),
      outputFormat: z
        .string()
        .optional()
        .describe(
          'Output audio format (e.g. "mp3_44100_128", "pcm_16000", "opus_48000_96"). Defaults to "mp3_44100_128"'
        ),
      voiceSettings: z
        .object({
          stability: z
            .number()
            .min(0)
            .max(1)
            .optional()
            .describe('Voice stability (0-1). Lower values are more expressive'),
          similarityBoost: z
            .number()
            .min(0)
            .max(1)
            .optional()
            .describe('Similarity boost (0-1). Higher values make voice closer to original'),
          style: z.number().min(0).max(1).optional().describe('Style exaggeration (0-1)'),
          useSpeakerBoost: z
            .boolean()
            .optional()
            .describe('Enable speaker boost for clearer voice'),
          speed: z
            .number()
            .min(0.25)
            .max(4.0)
            .optional()
            .describe('Speech speed multiplier (0.25-4.0)')
        })
        .optional()
        .describe('Voice settings for fine-tuning the output'),
      seed: z
        .number()
        .int()
        .optional()
        .describe('Seed for deterministic output (0-4294967295)'),
      previousText: z
        .string()
        .optional()
        .describe('Text that came before for continuity when chaining generations'),
      nextText: z
        .string()
        .optional()
        .describe('Text that comes after for continuity when chaining generations'),
      applyTextNormalization: z
        .enum(['auto', 'on', 'off'])
        .optional()
        .describe('Text normalization mode')
    })
  )
  .output(
    z.object({
      audioBase64: z.string().describe('Base64-encoded audio data'),
      contentType: z.string().describe('MIME type of the audio (e.g. "audio/mpeg")')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ElevenLabsClient(ctx.auth.token);

    let result = await client.textToSpeech(ctx.input.voiceId, {
      text: ctx.input.text,
      modelId: ctx.input.modelId,
      languageCode: ctx.input.languageCode,
      voiceSettings: ctx.input.voiceSettings,
      outputFormat: ctx.input.outputFormat,
      seed: ctx.input.seed,
      previousText: ctx.input.previousText,
      nextText: ctx.input.nextText,
      applyTextNormalization: ctx.input.applyTextNormalization
    });

    return {
      output: result,
      message: `Generated speech audio from ${ctx.input.text.length} characters of text using voice \`${ctx.input.voiceId}\`. Output format: ${ctx.input.outputFormat || 'mp3_44100_128'}.`
    };
  })
  .build();
