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

export let voiceChanger = SlateTool.create(spec, {
  name: 'Voice Changer',
  key: 'voice_changer',
  description: `Transform an existing audio file to sound like a selected ElevenLabs voice while preserving timing and delivery. Returns generated audio as a Slate attachment.`,
  instructions: ['Use list_voices first to find the target voice ID.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      voiceId: z.string().describe('ID of the voice to transform the audio into'),
      fileBase64: z.string().describe('Base64-encoded source audio file'),
      fileName: z.string().optional().describe('Original filename for the source audio'),
      modelId: z
        .string()
        .optional()
        .describe('Speech-to-speech model ID. Defaults to eleven_english_sts_v2.'),
      outputFormat: z.string().optional().describe('Audio output format, e.g. mp3_44100_128'),
      voiceSettings: voiceSettingsSchema
        .optional()
        .describe('Voice settings overrides for this request'),
      seed: z
        .number()
        .int()
        .min(0)
        .max(4294967295)
        .optional()
        .describe('Best-effort deterministic generation seed'),
      removeBackgroundNoise: z
        .boolean()
        .optional()
        .describe('Remove background noise from the input before voice conversion'),
      fileFormat: z
        .enum(['pcm_s16le_16', 'other'])
        .optional()
        .describe('Input format. Use pcm_s16le_16 for raw 16-bit 16kHz mono PCM.')
    })
  )
  .output(audioOutputSchema)
  .handleInvocation(async ctx => {
    let client = new ElevenLabsClient(ctx.auth.token);
    let result = await client.voiceChanger(ctx.input.voiceId, {
      fileBase64: ctx.input.fileBase64,
      fileName: ctx.input.fileName,
      modelId: ctx.input.modelId,
      outputFormat: ctx.input.outputFormat,
      voiceSettings: ctx.input.voiceSettings,
      seed: ctx.input.seed,
      removeBackgroundNoise: ctx.input.removeBackgroundNoise,
      fileFormat: ctx.input.fileFormat
    });

    return {
      output: audioOutput(result),
      attachments: [audioAttachment(result)],
      message: `Converted audio to voice \`${ctx.input.voiceId}\`.`
    };
  })
  .build();
