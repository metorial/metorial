import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let textSegmentSchema = z.object({
  voiceId: z
    .string()
    .describe(
      'Voice ID to use for this segment (e.g., "en-US-RyanMultilingualNeural"). Use the List Voices tool to discover available voice IDs.'
    ),
  text: z.string().describe('Text content to convert to speech.'),
  pitch: z
    .number()
    .min(-50)
    .max(50)
    .optional()
    .describe('Pitch adjustment from -50 to 50. Omit to use the default.'),
  speakingRate: z
    .number()
    .min(20)
    .max(200)
    .optional()
    .describe('Speaking rate from 20 to 200. Omit to use the default.'),
  volume: z
    .number()
    .min(-40)
    .max(40)
    .optional()
    .describe('Volume adjustment from -40 to 40. Omit to use the default.')
});

export let generateAudio = SlateTool.create(spec, {
  name: 'Generate Audio',
  key: 'generate_audio',
  description: `Convert text to speech audio using AI voices. Supports multiple text segments with different voices in a single request to create conversational or multi-voice audio. Each segment can have independent SSML controls for pitch, speaking rate, and volume. Returns Base64-encoded audio.`,
  instructions: [
    'Use the List Voices tool first to find available voice IDs for your target language.',
    'When using multiple segments, each segment can use a different voice to create conversational audio.'
  ],
  constraints: [
    'Rate limit: 75 requests per minute, 5,000 requests per day.',
    'Pitch must be between -50 and 50.',
    'Speaking rate must be between 20 and 200.',
    'Volume must be between -40 and 40.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      segments: z
        .array(textSegmentSchema)
        .min(1)
        .describe(
          'One or more text segments to convert to speech. Each segment specifies a voice and text, with optional SSML controls.'
        )
    })
  )
  .output(
    z.object({
      audioBase64: z.string().describe('Base64-encoded audio content.'),
      message: z.string().describe('Status message from the API.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.progress('Generating audio...');

    let result = await client.createAudio(
      ctx.input.segments.map(s => ({
        voiceId: s.voiceId,
        text: s.text,
        pitch: s.pitch,
        speakingRate: s.speakingRate,
        volume: s.volume
      }))
    );

    if (!result.status) {
      throw new Error(`Audio generation failed: ${result.message}`);
    }

    let segmentCount = ctx.input.segments.length;
    let voiceIds = [...new Set(ctx.input.segments.map(s => s.voiceId))];

    return {
      output: {
        audioBase64: result.audio,
        message: result.message
      },
      message: `Generated audio from **${segmentCount}** text segment${segmentCount > 1 ? 's' : ''} using **${voiceIds.length}** voice${voiceIds.length > 1 ? 's' : ''}.`
    };
  })
  .build();
