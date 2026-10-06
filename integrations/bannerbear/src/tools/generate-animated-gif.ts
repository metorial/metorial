import { SlateTool } from 'slates';
import { z } from 'zod';
import { BannerbearClient } from '../lib/client';
import { stateMessage } from '../lib/contracts';
import { deliverGeneratedFiles, gifOutput } from '../lib/results';
import { projectIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let generateAnimatedGif = SlateTool.create(spec, {
  name: 'Generate Animated GIF',
  key: 'generate_animated_gif',
  description: `Create a slideshow-style animated GIF from a Bannerbear template by providing multiple frames of modifications. Each frame applies different content to the same template. Configurable frame rate, per-frame durations, and looping.`,
  instructions: [
    'Each frame is a list of modifications applied to the template. Provide between 1 and 30 frames.',
    'Optionally provide an input video URL to auto-generate frame thumbnails instead of manually specifying frames.'
  ],
  constraints: ['Maximum of 30 frames per animated GIF.', 'GIF generation is asynchronous.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      projectId: projectIdSchema,
      templateUid: z.string().describe('UID of the template to use for each frame'),
      frames: z
        .array(
          z.array(
            z.object({
              name: z.string().describe('Layer name to modify'),
              text: z.string().optional().describe('Text content'),
              image_url: z.string().optional().describe('Image URL'),
              color: z.string().optional().describe('Color (hex)')
            })
          )
        )
        .describe('List of frames, each containing modifications for that frame'),
      inputMediaUrl: z
        .string()
        .optional()
        .describe('URL of a video to auto-generate frame thumbnails from'),
      fps: z
        .number()
        .optional()
        .describe('Positive integer frames per second (provider default 1)'),
      frameDurations: z
        .array(z.number())
        .optional()
        .describe('Duration in seconds for each frame'),
      loop: z.boolean().optional().describe('Whether the GIF should loop (default true)'),
      metadata: z.string().optional().describe('Custom metadata to attach'),
      webhookUrl: z
        .string()
        .optional()
        .describe('URL to receive a POST when rendering completes')
    })
  )
  .output(
    z.object({
      gifUid: z.string().describe('UID of the generated animated GIF'),
      status: z.string().describe('Rendering status'),
      imageUrl: z.string().nullable().describe('URL of the generated GIF file'),
      createdAt: z.string().describe('Timestamp when the GIF was created')
    })
  )
  .handleInvocation(async ctx => {
    const client = new BannerbearClient({ ...ctx.auth, projectId: ctx.input.projectId });
    const result = await client.createAnimatedGif({
      template: ctx.input.templateUid,
      frames: ctx.input.frames,
      input_media_url: ctx.input.inputMediaUrl,
      fps: ctx.input.fps,
      frame_durations: ctx.input.frameDurations,
      loop: ctx.input.loop,
      metadata: ctx.input.metadata,
      webhook_url: ctx.input.webhookUrl
    });
    const output = gifOutput(result);
    await deliverGeneratedFiles(ctx, 'animated_gif', result);
    return {
      output,
      message: `Animated GIF generation ${stateMessage(result.status)} (UID: ${output.gifUid}). Read its status with get_resource.`
    };
  })
  .build();
