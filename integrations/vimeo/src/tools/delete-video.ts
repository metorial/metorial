import { SlateTool } from 'slates';
import { z } from 'zod';
import { VimeoClient } from '../lib/client';
import { spec } from '../spec';

export let deleteVideoTool = SlateTool.create(spec, {
  name: 'Delete Video',
  key: 'delete_video',
  description: `Delete a video owned by the authenticated user. Vimeo may retain deletion state or history; this tool does not restore the video or erase retained history.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      videoId: z.string().describe('The ID of the video to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the video was successfully deleted'),
      videoId: z.string().describe('The ID of the deleted video')
    })
  )
  .handleInvocation(async ctx => {
    let client = new VimeoClient(ctx.auth.token);
    await client.deleteVideo(ctx.input.videoId);

    return {
      output: {
        deleted: true,
        videoId: ctx.input.videoId
      },
      message: `Deleted video **${ctx.input.videoId}**`
    };
  })
  .build();
