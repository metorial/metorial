import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteVideo = SlateTool.create(spec, {
  name: 'Delete Video',
  key: 'delete_video',
  description: `Permanently delete a video and all associated subtitles from the Amara platform. Requires team admin permissions for team videos.`,
  tags: {
    destructive: true
  },
  constraints: [
    'Requires team admin permissions if the video belongs to a team.',
    'This action is irreversible - all subtitles and collaborations on the video will also be deleted.'
  ]
})
  .input(
    z.object({
      videoId: z.string().describe('The video identifier to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the video was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      username: ctx.auth.username
    });

    await client.deleteVideo(ctx.input.videoId);

    return {
      output: { deleted: true },
      message: `Deleted video \`${ctx.input.videoId}\` and all associated subtitles.`
    };
  })
  .build();
