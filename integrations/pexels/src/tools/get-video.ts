import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { videoSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getVideo = SlateTool.create(spec, {
  name: 'Get Video',
  key: 'get_video',
  description: `Retrieve a specific video by its Pexels ID. Returns full video details including duration, dimensions, videographer info, video files at various qualities/resolutions, and preview pictures.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      videoId: z.number().describe('The Pexels ID of the video to retrieve')
    })
  )
  .output(videoSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let video = await client.getVideo(ctx.input.videoId);

    return {
      output: video,
      message: `Retrieved video **#${video.videoId}** by **${video.user.name}** (${video.width}x${video.height}, ${video.duration}s, ${video.videoFiles.length} file versions).`
    };
  })
  .build();
