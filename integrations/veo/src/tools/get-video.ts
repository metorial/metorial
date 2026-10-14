import { createApiServiceError, isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getVideo = SlateTool.create(spec, {
  name: 'Get Video',
  key: 'get_video',
  description:
    'Retrieve the details of a VEO video by ID. Call list_videos to discover video IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      videoId: z.string().describe('Video ID. Call list_videos to discover videos.')
    })
  )
  .output(
    z.object({
      videoId: z.string().describe('The requested video ID'),
      video: z.record(z.string(), z.unknown()).describe('Video details returned by VEO')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, environment: ctx.auth.environment });
    let video = await client.getVideo(ctx.input.videoId);
    if (!isApiErrorRecord(video)) {
      throw createApiServiceError('VEO returned invalid video details.');
    }
    return {
      output: { videoId: ctx.input.videoId, video },
      message: `Retrieved video \`${ctx.input.videoId}\`.`
    };
  })
  .build();
