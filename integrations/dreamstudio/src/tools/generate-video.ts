import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateVideo = SlateTool.create(spec, {
  name: 'Generate Video',
  key: 'generate_video',
  description: `Generate a short video (~2 seconds) from an input image using Stable Video Diffusion. The operation is **asynchronous** — the job is submitted and polled for completion (typically under 2 minutes). Costs 20 credits.`,
  instructions: [
    'Input image must be 1024x576, 576x1024, or 768x768 pixels, in JPEG or PNG format.',
    'Use motionBucketId to control the amount of motion in the generated video (higher = more motion).'
  ],
  constraints: [
    'Image must be exactly 1024x576, 576x1024, or 768x768.',
    'Results are stored for 24 hours only.'
  ],
  tags: {
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
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let input = ctx.input;

    ctx.progress('Submitting video generation job...');

    let { generationId } = await client.generateVideoSubmit({
      image: input.image,
      seed: input.seed,
      cfgScale: input.cfgScale,
      motionBucketId: input.motionBucketId
    });

    ctx.progress(`Job submitted. Generation ID: ${generationId}. Polling for result...`);

    let result = await client.pollAsyncResult(`/v2beta/image-to-video/result/${generationId}`);

    return {
      output: result,
      message: `Video generated successfully. Generation ID: \`${generationId}\`, seed: \`${result.seed}\`. Finish reason: ${result.finishReason}.`
    };
  })
  .build();
