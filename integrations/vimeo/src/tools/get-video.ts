import { SlateTool } from 'slates';
import { z } from 'zod';
import { VimeoClient } from '../lib/client';
import { mapVideo, videoSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getVideoTool = SlateTool.create(spec, {
  name: 'Get Video',
  key: 'get_video',
  description: `Retrieve detailed information about a specific Vimeo video including its metadata, privacy settings, embed code, statistics, and thumbnail.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      videoId: z.string().describe('The ID of the video to retrieve')
    })
  )
  .output(videoSchema)
  .handleInvocation(async ctx => {
    let client = new VimeoClient(ctx.auth.token);
    let video = await client.getVideo(ctx.input.videoId);
    let mapped = mapVideo(video);

    return {
      output: mapped,
      message: `Retrieved video **${mapped.name}** (${mapped.videoId})`
    };
  })
  .build();
