import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateSpeech = SlateTool.create(spec, {
  name: 'Generate Speech',
  key: 'generate_speech',
  description: `Converts text into synthesized speech audio using LMNT's AI models. Select a voice from the voice library or use a custom cloned voice, choose the output format, and control expressiveness and stability parameters. Returns the generated audio as base64-encoded data.`,
  instructions: [
    'Use the **list_voices** tool first to find available voice IDs.',
    'Specifying a language code is recommended for faster generation instead of relying on auto-detection.'
  ],
  constraints: ['Maximum 5000 characters per request including spaces.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      voiceId: z
        .string()
        .describe(
          'The voice ID to use for synthesis. Retrieve available IDs with the list_voices tool.'
        ),
      text: z
        .string()
        .describe('The text to synthesize into speech. Max 5000 characters including spaces.'),
      model: z
        .enum(['aurora', 'blizzard'])
        .optional()
        .describe('The model to use for synthesis. Defaults to blizzard.'),
      language: z
        .enum([
          'ar',
          'de',
          'en',
          'es',
          'fr',
          'hi',
          'id',
          'it',
          'ja',
          'ko',
          'nl',
          'pl',
          'pt',
          'ru',
          'sv',
          'th',
          'tr',
          'uk',
          'ur',
          'vi',
          'zh'
        ])
        .optional()
        .describe('Two-letter ISO 639-1 language code. Defaults to auto-detection.'),
      format: z
        .enum(['aac', 'mp3', 'ulaw', 'wav', 'webm', 'pcm_s16le', 'pcm_f32le'])
        .optional()
        .describe('Output audio format. Defaults to mp3.'),
      sampleRate: z
        .number()
        .optional()
        .describe('Output sample rate in Hz. Defaults to 24000.'),
      temperature: z
        .number()
        .min(0)
        .optional()
        .describe(
          'Controls expressiveness and emotional variation. Lower values produce more neutral speech. Defaults to 1.'
        ),
      topP: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe(
          'Controls stability of generated speech. Lower values produce more consistent speech. Defaults to 0.8.'
        ),
      seed: z
        .number()
        .int()
        .optional()
        .describe('Seed for reproducible output. Random by default.'),
      store: z
        .boolean()
        .optional()
        .describe('If true, saves the generated speech to your LMNT clip library.')
    })
  )
  .output(
    z.object({
      audio: z.string().describe('Base64-encoded audio data.'),
      format: z.string().describe('The audio format of the output (e.g. mp3, wav, aac).')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.synthesizeSpeech({
      voice: ctx.input.voiceId,
      text: ctx.input.text,
      model: ctx.input.model,
      language: ctx.input.language,
      format: ctx.input.format,
      sampleRate: ctx.input.sampleRate,
      temperature: ctx.input.temperature,
      topP: ctx.input.topP,
      seed: ctx.input.seed,
      store: ctx.input.store
    });

    return {
      output: result,
      message: `Generated speech in **${result.format}** format from ${ctx.input.text.length} characters of text using voice \`${ctx.input.voiceId}\`.`
    };
  })
  .build();
