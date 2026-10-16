import { SlateTool } from 'slates';
import { z } from 'zod';
import { decodeAudio, getAudioFormat } from '../lib/audio';
import { Client } from '../lib/client';
import { spec } from '../spec';

let textSegmentSchema = z.object({
  voiceId: z
    .string()
    .describe(
      'Voice ID to use for this segment. Use list_voices to discover available voice IDs.'
    ),
  text: z.string().describe('Text content to convert to speech.'),
  pitch: z
    .number()
    .min(-50)
    .max(50)
    .optional()
    .describe('Integer pitch adjustment from -50 to 50. Omit to use the default.'),
  speakingRate: z
    .number()
    .min(20)
    .max(200)
    .optional()
    .describe('Integer speaking rate from 20 to 200. Omit to use the default.'),
  volume: z
    .number()
    .min(-40)
    .max(40)
    .optional()
    .describe('Integer volume adjustment from -40 to 40. Omit to use the default.')
});

export let generateAudio = SlateTool.create(spec, {
  name: 'Generate Audio',
  key: 'generate_audio',
  description: `Convert text to speech audio using AI voices. Combine multiple text segments and voices in a single request, with independent pitch, speaking rate, and volume controls. Provides a downloadable audio file and the original Base64 audio for existing workflows.`,
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
      message: z.string().describe('Status message from the API.'),
      filename: z.string().optional().describe('Name of the generated audio file.'),
      mimeType: z
        .string()
        .optional()
        .describe('Detected audio MIME type, or application/octet-stream if unknown.'),
      byteSize: z.number().optional().describe('Size of the decoded audio in bytes.')
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

    let content = decodeAudio(result.audio, 'AiVOOV generated audio');
    let format = getAudioFormat(content);
    let filename = `generated-audio.${format?.extension ?? 'bin'}`;
    let mimeType = format?.mimeType ?? 'application/octet-stream';
    await ctx.addAttachment({
      type: 'content',
      content: new Response(new Uint8Array(content), {
        headers: { 'Content-Type': mimeType }
      }),
      filename,
      mimeType
    });

    let segmentCount = ctx.input.segments.length;
    let voiceIds = [...new Set(ctx.input.segments.map(s => s.voiceId))];

    return {
      output: {
        audioBase64: result.audio,
        message: result.message,
        filename,
        mimeType,
        byteSize: content.length
      },
      message: `Generated audio from **${segmentCount}** text segment${segmentCount > 1 ? 's' : ''} using **${voiceIds.length}** voice${voiceIds.length > 1 ? 's' : ''}.`
    };
  })
  .build();
