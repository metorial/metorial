import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteVideos = SlateTool.create(spec, {
  name: 'Delete Videos',
  key: 'delete_videos',
  description: `Delete one or more videos from your Spotlightr account by providing their video IDs. This action is permanent and cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      videoIds: z.array(z.string()).min(1).describe('Array of video IDs to delete.')
    })
  )
  .output(
    z.object({
      result: z
        .record(z.string(), z.any())
        .describe('Response from Spotlightr after deleting the videos.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.deleteVideos(ctx.input.videoIds);

    return {
      output: {
        result
      },
      message: `Deleted **${ctx.input.videoIds.length}** video(s) from Spotlightr.`
    };
  })
  .build();
