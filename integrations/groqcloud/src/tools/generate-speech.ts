import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateSpeech = SlateTool.create(spec, {
  name: 'Generate Speech',
  key: 'generate_speech',
  description: `Convert text to spoken audio using Groq's text-to-speech API. Supports English and Arabic voices with configurable voice selection, speed, and output format. Some models support vocal direction tags like \`[cheerful]\` embedded in the input text.`,
  instructions: [
    'Specify the text to convert, a model, and a voice.',
    'For expressive output with the Orpheus English model, embed vocal direction tags in the input text (e.g., "[cheerful] Hello there!").',
    'Returns base64-encoded audio data.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      text: z
        .string()
        .describe(
          'Text to convert to speech. May include vocal direction tags like [cheerful] for supported models'
        ),
      model: z
        .string()
        .default('canopylabs/orpheus-v1-english')
        .describe(
          'TTS model ID (e.g., "canopylabs/orpheus-v1-english", "canopylabs/orpheus-arabic-saudi")'
        ),
      voice: z.string().describe('Voice to use for speech generation'),
      responseFormat: z
        .enum(['flac', 'mp3', 'mulaw', 'ogg', 'wav'])
        .optional()
        .describe('Audio output format'),
      sampleRate: z
        .enum(['8000', '16000', '22050', '24000', '32000', '44100', '48000'])
        .optional()
        .describe('Audio sample rate in Hz'),
      speed: z
        .number()
        .min(0.5)
        .max(5)
        .optional()
        .describe('Speech speed multiplier (0.5 to 5)')
    })
  )
  .output(
    z.object({
      audioBase64: z.string().describe('Base64-encoded audio data'),
      format: z.string().describe('Audio format of the output')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let audioBase64 = await client.createSpeech({
      model: ctx.input.model,
      input: ctx.input.text,
      voice: ctx.input.voice,
      responseFormat: ctx.input.responseFormat,
      sampleRate: ctx.input.sampleRate ? Number.parseInt(ctx.input.sampleRate, 10) : undefined,
      speed: ctx.input.speed
    });

    let format = ctx.input.responseFormat ?? 'wav';

    return {
      output: {
        audioBase64,
        format
      },
      message: `Generated speech audio in **${format}** format using **${ctx.input.model}** with voice "${ctx.input.voice}".`
    };
  })
  .build();
