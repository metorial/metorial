import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateVideoSource = SlateTool.create(spec, {
  name: 'Update Video Source',
  key: 'update_video_source',
  description: `Replace the source of an existing video without changing its embed code, watch page URL, or analytics history. Useful for swapping out video content while preserving all existing embeds and links.`
})
  .input(
    z.object({
      videoId: z.string().describe('The ID of the video to update.'),
      url: z.string().describe('The new source URL for the video.')
    })
  )
  .output(
    z.object({
      result: z
        .record(z.string(), z.any())
        .describe('Response from Spotlightr after updating the video source.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.updateVideoSource(ctx.input.videoId, ctx.input.url);

    return {
      output: {
        result
      },
      message: `Updated source for video **${ctx.input.videoId}** to new URL.`
    };
  })
  .build();
