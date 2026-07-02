import { SlateTool } from 'slates';
import { z } from 'zod';
import { BannerbearClient } from '../lib/client';
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
    let client = new BannerbearClient({ token: ctx.auth.token });

    let result = await client.createMovie({
      width: ctx.input.width,
      height: ctx.input.height,
      inputs: ctx.input.inputs.map(i => ({
        asset_url: i.assetUrl,
        trim_to_length_in_seconds: i.trimToLengthInSeconds,
        mute: i.mute
      })),
      transition: ctx.input.transition,
      soundtrack_url: ctx.input.soundtrackUrl,
      metadata: ctx.input.metadata,
      webhook_url: ctx.input.webhookUrl
    });

    return {
      output: {
        movieUid: result.uid,
        status: result.status,
        videoUrl: result.video_url || null,
        percentRendered: result.percent_rendered ?? null,
        totalLengthInSeconds: result.total_length_in_seconds ?? null,
        createdAt: result.created_at
      },
      message: `Movie composition ${result.status === 'completed' ? 'completed' : 'initiated'} (UID: ${result.uid}) with ${ctx.input.inputs.length} clips. ${result.video_url ? `[View movie](${result.video_url})` : 'Movie is still rendering.'}`
    };
  })
  .build();
