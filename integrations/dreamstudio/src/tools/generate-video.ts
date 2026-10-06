import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let generateVideo = SlateTool.create(spec, {
  name: 'Generate Video',
  key: 'generate_video',
  description:
    'DEPRECATED — Stability AI retired its hosted Stable Video Diffusion API on July 24, 2025. This tool no longer generates videos.',
  instructions: [
    'Hosted video generation is unavailable. Stability AI offers this model only for self-hosting.'
  ],
  tags: {
    deprecated: true,
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      image: z
        .string()
        .describe('Base64-encoded source image (must be 1024x576, 576x1024, or 768x768)'),
      seed: z
        .number()
        .int()
        .min(0)
        .max(4294967294)
        .optional()
        .describe('Seed for reproducible generation'),
      cfgScale: z
        .number()
        .min(0)
        .max(10)
        .optional()
        .describe('How closely to follow the input image (0-10)'),
      motionBucketId: z
        .number()
        .int()
        .min(1)
        .max(255)
        .optional()
        .describe(
          'Controls motion amount (1-255, default 128). Higher values produce more motion.'
        )
    })
  )
  .output(
    z.object({
      base64: z.string().describe('Base64-encoded MP4 video data'),
      seed: z.number().describe('Seed used for this generation'),
      finishReason: z.string().describe('Finish reason (SUCCESS or CONTENT_FILTERED)')
    })
  )
  .handleInvocation(async () => {
    throw createApiServiceError(
      'Stability AI retired the hosted Stable Video Diffusion API on July 24, 2025. Hosted video generation is no longer available.',
      { reason: 'provider_service_retired' }
    );
  })
  .build();
