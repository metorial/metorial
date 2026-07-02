import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let faceSwap = SlateTool.create(spec, {
  name: 'Face Swap',
  key: 'face_swap',
  description: `Swap a face in an image with a face from another image using AI. The target image must contain a visible face to be replaced.
Can also generate AI avatars and business photos from a face image with creative transformation options.`,
  instructions: [
    'targetImageUrl is the image containing the face to be replaced.',
    'sourceFaceUrl is the image providing the replacement face.',
    'Use strength to control blending intensity (lower = more subtle).',
    'Set a description prompt to reimagine the scene around the swapped face.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      targetImageUrl: z.string().describe('URL of the image with the face to replace'),
      sourceFaceUrl: z.string().describe('URL of the image providing the new face'),
      strength: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Blending intensity (0-1). Lower values produce more subtle results'),
      avatarGenerationType: z
        .enum(['creative_img2img'])
        .optional()
        .describe('Avatar generation mode for creative transformations'),
      description: z
        .string()
        .optional()
        .describe(
          'Optional prompt to reimagine the scene (e.g. "cinematic scene with dramatic lighting")'
        ),
      width: z.number().optional().describe('Target output width in pixels'),
      height: z.number().optional().describe('Target output height in pixels'),
      outputFormat: z.enum(['jpg', 'png', 'webp']).optional().describe('Output image format')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Processing status'),
      jobId: z.string().describe('Job identifier for tracking'),
      resultUrl: z.string().optional().describe('URL to the processed image when complete')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.processImageSync({
      url: ctx.input.targetImageUrl,
      width: ctx.input.width,
      height: ctx.input.height,
      outputFormat: ctx.input.outputFormat,
      background: {
        generate: {
          adapterType: 'face',
          ipImage2: ctx.input.sourceFaceUrl,
          strength: ctx.input.strength,
          avatarGenerationType: ctx.input.avatarGenerationType,
          description: ctx.input.description
        }
      }
    });

    let message =
      result.status === 'complete'
        ? `Face swap completed successfully. Result: ${result.resultUrl}`
        : `Face swap processing started (status: **${result.status}**). Job ID: \`${result.jobId}\`.`;

    return {
      output: result,
      message
    };
  })
  .build();
