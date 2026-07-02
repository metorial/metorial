import { SlateTool } from 'slates';
import { z } from 'zod';
import { HeyGenClient } from '../lib/client';
import { spec } from '../spec';

export let deleteVideo = SlateTool.create(spec, {
  name: 'Delete Video',
  key: 'delete_video',
  description: `Permanently delete a generated video from your HeyGen account.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      videoId: z.string().describe('ID of the video to delete')
    })
  )
  .output(
    z.object({
      videoId: z.string().describe('ID of the deleted video'),
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HeyGenClient({ token: ctx.auth.token });

    await client.deleteVideo(ctx.input.videoId);

    return {
      output: {
        videoId: ctx.input.videoId,
        deleted: true
      },
      message: `Video **${ctx.input.videoId}** has been deleted.`
    };
  })
  .build();
