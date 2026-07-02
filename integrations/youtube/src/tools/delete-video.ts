import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { youtubeActionScopes } from '../scopes';
import { spec } from '../spec';

export let deleteVideo = SlateTool.create(spec, {
  name: 'Delete Video',
  key: 'delete_video',
  description: `Permanently delete a YouTube video. This action cannot be undone. Requires ownership of the video.`,
  tags: {
    destructive: true
  }
})
  .scopes(youtubeActionScopes.deleteVideo)
  .input(
    z.object({
      videoId: z.string().describe('ID of the video to delete')
    })
  )
  .output(
    z.object({
      videoId: z.string(),
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = Client.fromAuth(ctx.auth);

    await client.deleteVideo(ctx.input.videoId);

    return {
      output: {
        videoId: ctx.input.videoId,
        deleted: true
      },
      message: `Deleted video \`${ctx.input.videoId}\`.`
    };
  })
  .build();
