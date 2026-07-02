import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { stabilityServiceError } from '../lib/errors';
import { spec } from '../spec';
import {
  audioOutputFormatEnum,
  createMediaAttachment,
  mediaAttachmentOutputSchema,
  toMediaAttachmentOutput
} from './shared';

export let generateAudio = SlateTool.create(spec, {
  name: 'Generate Audio',
  key: 'generate_audio',
  description: `Generate or transform audio using Stability AI's current Stable Audio APIs. Supports:
- **text_to_audio**: Generate audio from a text prompt.
- **audio_to_audio**: Transform an input audio clip with prompt guidance.
- **inpaint**: Regenerate a time range inside an input audio clip.

Describe the desired audio including genre, mood, instruments, tempo, and style for best results.`,
  constraints: [
    'Stable Audio 3 supports durations up to 380 seconds.',
    'Stable Audio 2 and 2.5 support durations up to 190 seconds.',
    'audio_to_audio and inpaint require base64-encoded input audio.'
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
      mode: z
        .enum(['text_to_audio', 'audio_to_audio', 'inpaint'])
        .default('text_to_audio')
        .describe('Audio operation to perform.'),
      model: z
        .enum(['stable-audio-3', 'stable-audio-2.5', 'stable-audio-2'])
        .default('stable-audio-3')
        .describe('Stable Audio model family to use.'),
      duration: z
        .number()
        .min(1)
        .max(380)
        .optional()
        .describe('Duration of the generated audio in seconds. Max 380 for Stable Audio 3.'),
      seed: z.number().optional().describe('Seed for reproducible results.'),
      steps: z
        .number()
        .int()
        .min(4)
        .max(8)
        .optional()
        .describe('Generation steps. Stable Audio 3 supports 4-8.'),
      cfgScale: z.number().min(1).max(25).optional().describe('Prompt adherence scale.'),
      audio: z
        .string()
        .optional()
        .describe('Base64-encoded input audio. Required for audio_to_audio and inpaint.'),
      strength: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('How strongly to transform the input audio. Used by audio_to_audio.'),
      maskStart: z
        .number()
        .min(0)
        .max(380)
        .optional()
        .describe('Start time in seconds for the inpaint mask. Used by inpaint.'),
      maskEnd: z
        .number()
        .min(0)
        .max(380)
        .optional()
        .describe('End time in seconds for the inpaint mask. Used by inpaint.'),
      outputFormat: audioOutputFormatEnum
    })
  )
  .output(mediaAttachmentOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let mode = ctx.input.mode.replaceAll('_', '-') as
      | 'text-to-audio'
      | 'audio-to-audio'
      | 'inpaint';

    if (ctx.input.model !== 'stable-audio-3' && (ctx.input.duration ?? 190) > 190) {
      throw stabilityServiceError(
        'Stable Audio 2 and 2.5 duration must be 190 seconds or less.'
      );
    }

    if (
      (ctx.input.mode === 'audio_to_audio' || ctx.input.mode === 'inpaint') &&
      !ctx.input.audio
    ) {
      throw stabilityServiceError('audio is required for audio_to_audio and inpaint modes.');
    }

    if (
      ctx.input.mode === 'inpaint' &&
      ctx.input.maskStart !== undefined &&
      ctx.input.maskEnd !== undefined &&
      ctx.input.maskStart >= ctx.input.maskEnd
    ) {
      throw stabilityServiceError('maskStart must be less than maskEnd for inpaint mode.');
    }

    let result = await client.generateAudio({
      mode,
      prompt: ctx.input.prompt,
      model: ctx.input.model,
      duration: ctx.input.duration,
      seed: ctx.input.seed,
      steps: ctx.input.steps,
      cfgScale: ctx.input.cfgScale,
      audio: ctx.input.audio,
      strength: ctx.input.strength,
      maskStart: ctx.input.maskStart,
      maskEnd: ctx.input.maskEnd,
      outputFormat: ctx.input.outputFormat
    });

    return {
      output: toMediaAttachmentOutput(result),
      attachments: [createMediaAttachment(result)],
      message: `Generated audio using **${ctx.input.model}** ${ctx.input.mode}. Attachment MIME: \`${result.mimeType}\`.`
    };
  })
  .build();
