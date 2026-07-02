import { SlateTool } from 'slates';
import { z } from 'zod';
import { HeyGenClient } from '../lib/client';
import { spec } from '../spec';

export let generateSpeech = SlateTool.create(spec, {
  name: 'Generate Speech',
  key: 'generate_speech',
  description: `Generate natural-sounding speech audio from text using HeyGen's text-to-speech engine. Returns an audio URL suitable for narration, podcasts, IVR prompts, or use as audio input in video generation.`,
  instructions: ['Use "list_voices" to find available voice IDs.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      text: z.string().describe('Text content to convert to speech'),
      voiceId: z.string().describe('Voice ID to use for speech generation'),
      speed: z
        .number()
        .optional()
        .describe('Speech speed multiplier (e.g. 1.0 for normal, 1.5 for faster)'),
      title: z.string().optional().describe('Title for the audio')
    })
  )
  .output(
    z.object({
      audioUrl: z.string().describe('URL to the generated audio file')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HeyGenClient({ token: ctx.auth.token });

    let result = await client.generateSpeech({
      text: ctx.input.text,
      voiceId: ctx.input.voiceId,
      speed: ctx.input.speed,
      title: ctx.input.title
    });

    return {
      output: result,
      message: `Speech generated successfully. [Download audio](${result.audioUrl})`
    };
  })
  .build();
