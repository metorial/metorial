import { SlateTool } from 'slates';
import { z } from 'zod';
import { BannerbearClient } from '../lib/client';
import { stateMessage } from '../lib/contracts';
import { deliverGeneratedFiles, movieOutput } from '../lib/results';
import { projectIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let composeMovie = SlateTool.create(spec, {
  name: 'Compose Movie',
  key: 'compose_movie',
  description: `Combine multiple video clips or still images into a single MP4 movie file. Supports optional transitions (fade, pixelize, slide variants) between clips and a soundtrack overlay. Useful for assembling intro/content/outro sequences.`,
  constraints: ['Maximum of 10 input clips.', 'Movie composition is asynchronous.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      projectId: projectIdSchema,
      width: z.number().describe('Output video width in pixels'),
      height: z.number().describe('Output video height in pixels'),
      inputs: z
        .array(
          z.object({
            assetUrl: z.string().describe('URL of the video clip or still image'),
            trimToLengthInSeconds: z
              .number()
              .optional()
              .describe('Trim this clip to a specific length'),
            mute: z.boolean().optional().describe('Mute the audio of this clip')
          })
        )
        .describe('Ordered list of video clips or images to combine'),
      transition: z
        .enum(['fade', 'pixelize', 'slidedown', 'slideup', 'slideleft', 'slideright'])
        .optional()
        .describe('Transition effect between clips'),
      soundtrackUrl: z
        .string()
        .optional()
        .describe('URL of an audio file to overlay as soundtrack'),
      metadata: z.string().optional().describe('Custom metadata to attach'),
      webhookUrl: z
        .string()
        .optional()
        .describe('URL to receive a POST when rendering completes')
    })
  )
  .output(
    z.object({
      movieUid: z.string().describe('UID of the composed movie'),
      status: z.string().describe('Rendering status'),
      videoUrl: z.string().nullable().describe('URL of the composed movie file'),
      percentRendered: z.number().nullable().describe('Rendering progress percentage'),
      totalLengthInSeconds: z.number().nullable().describe('Total movie length in seconds'),
      createdAt: z.string().describe('Timestamp when the movie was created')
    })
  )
  .handleInvocation(async ctx => {
    const client = new BannerbearClient({ ...ctx.auth, projectId: ctx.input.projectId });
    const result = await client.createMovie({
      width: ctx.input.width,
      height: ctx.input.height,
      inputs: ctx.input.inputs.map(item => ({
        asset_url: item.assetUrl,
        trim_to_length_in_seconds: item.trimToLengthInSeconds,
        mute: item.mute
      })),
      transition: ctx.input.transition,
      soundtrack_url: ctx.input.soundtrackUrl,
      metadata: ctx.input.metadata,
      webhook_url: ctx.input.webhookUrl
    });
    const output = movieOutput(result);
    await deliverGeneratedFiles(ctx, 'movie', result);
    return {
      output,
      message: `Movie composition ${stateMessage(result.status)} (UID: ${output.movieUid}). Read its status with get_resource.`
    };
  })
  .build();
