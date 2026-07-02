import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlaygroundClient } from '../lib/client';
import { spec } from '../spec';

export let generateSpeech = SlateTool.create(spec, {
  name: 'Generate Speech',
  key: 'generate_speech',
  description: `Convert text into natural-sounding speech using a specified voice. Returns base64-encoded WAV audio data. Supports 22+ Indic languages and English, including code-mixed text. Use the **List Voices** tool first to find available voice IDs.`,
  constraints: ['Text must be between 40 and 500 characters.', 'Costs 1 credit per character.']
})
  .input(
    z.object({
      voiceId: z.string().describe('Voice ID to use for synthesis (from List Voices)'),
      text: z
        .string()
        .min(40)
        .max(500)
        .describe('Text to convert to speech (40-500 characters)')
    })
  )
  .output(
    z.object({
      audioBase64: z.string().describe('Base64-encoded WAV audio data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlaygroundClient(ctx.auth.token);
    let result = await client.generateSpeech({
      voiceId: ctx.input.voiceId,
      text: ctx.input.text
    });

    return {
      output: {
        audioBase64: result.audioData
      },
      message: `Generated speech audio for ${ctx.input.text.length} characters of text.`
    };
  })
  .build();
