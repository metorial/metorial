import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateAudio = SlateTool.create(spec, {
  name: 'Generate Audio',
  key: 'generate_audio',
  description: `Generate audio tracks from text prompts using Stable Audio. Creates high-quality 44.1 kHz stereo audio with coherent musical structures. Supports melodies, sound effects, ambient audio, and various musical styles.

Describe the desired audio including genre, mood, instruments, and style for best results.`,
  constraints: [
    'Maximum duration is 180 seconds (3 minutes).',
    'Audio is generated at 44.1 kHz stereo quality.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      prompt: z
        .string()
        .describe(
          'Text description of the desired audio. Include genre, mood, instruments, tempo, and style for best results.'
        ),
      duration: z
        .number()
        .min(1)
        .max(180)
        .optional()
        .describe('Duration of the generated audio in seconds. Max 180 seconds.'),
      outputFormat: z.enum(['mp3', 'wav']).optional().describe('Output audio format.')
    })
  )
  .output(
    z.object({
      base64Audio: z.string().describe('Base64-encoded generated audio file.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.generateAudio({
      prompt: ctx.input.prompt,
      duration: ctx.input.duration,
      outputFormat: ctx.input.outputFormat
    });

    return {
      output: result,
      message: `Generated audio track${ctx.input.duration ? ` (${ctx.input.duration}s)` : ''} from prompt.`
    };
  })
  .build();
