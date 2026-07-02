import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let textToSpeech = SlateTool.create(spec, {
  name: 'Text to Speech',
  key: 'text_to_speech',
  description: `Convert text into natural-sounding speech audio using models from OpenAI, ElevenLabs, Deepgram, and Microsoft.
Supports 120+ languages, multiple voices, adjustable speed, and various audio formats (mp3, opus, aac, flac, wav, pcm).
Returns a URL to the generated audio file.`,
  instructions: [
    'Use model IDs like "openai/tts-1", "openai/tts-1-hd", "elevenlabs/eleven_multilingual_v2".',
    'Available voices for OpenAI models: alloy, ash, ballad, coral, echo, fable, nova, onyx, sage, shimmer, verse.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      model: z
        .string()
        .describe(
          'TTS model ID, e.g. "openai/tts-1", "openai/tts-1-hd", "elevenlabs/eleven_multilingual_v2"'
        ),
      text: z
        .string()
        .min(1)
        .max(4096)
        .describe('Text content to convert to speech (1-4096 characters)'),
      voice: z
        .string()
        .optional()
        .describe(
          'Voice name. For OpenAI: alloy, ash, ballad, coral, echo, fable, nova, onyx, sage, shimmer, verse'
        ),
      audioFormat: z
        .enum(['mp3', 'opus', 'aac', 'flac', 'wav', 'pcm'])
        .optional()
        .describe('Output audio format. Default: mp3'),
      speed: z
        .number()
        .min(0.25)
        .max(4.0)
        .optional()
        .describe('Speech speed. 1.0 is default, lower is slower, higher is faster')
    })
  )
  .output(
    z.object({
      audioUrl: z.string().optional().describe('URL of the generated audio file'),
      duration: z.number().optional().describe('Duration of the audio in seconds'),
      model: z.string().optional().describe('Model used for synthesis')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.textToSpeech({
      model: ctx.input.model,
      text: ctx.input.text,
      voice: ctx.input.voice,
      responseFormat: ctx.input.audioFormat,
      speed: ctx.input.speed
    });

    return {
      output: {
        audioUrl: result.audio?.url,
        duration: result.metadata?.duration,
        model: result.metadata?.model_info?.name
      },
      message: `Generated speech audio using **${ctx.input.model}**${ctx.input.voice ? ` with voice "${ctx.input.voice}"` : ''}. Text: "${ctx.input.text.substring(0, 80)}${ctx.input.text.length > 80 ? '...' : ''}"`
    };
  })
  .build();
