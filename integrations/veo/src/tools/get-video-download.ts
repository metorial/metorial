import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getVideoDownload = SlateTool.create(spec, {
  name: 'Get Video Download',
  key: 'get_video_download',
  description: `Get time-limited download URLs for a VEO video. Returns download tokens with URLs for various resolutions and aspect ratios of the transcoded video.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      videoId: z.string().describe('ID of the video to get download links for')
    })
  )
  .output(
    z.object({
      duration: z.number().optional().describe('Video duration in seconds'),
      tokens: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of download token objects with URLs and resolution info')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, environment: ctx.auth.environment });

    let result = await client.getVideoDownloadToken(ctx.input.videoId);

    let duration = result.Duration ?? result.duration;
    let tokens = result.Tokens ?? result.tokens ?? result.Token ?? result.token ?? [];

    return {
      output: {
        duration,
        tokens: Array.isArray(tokens) ? tokens : [tokens]
      },
      message: `Retrieved download links for video \`${ctx.input.videoId}\`${duration ? ` (duration: ${duration}s)` : ''}.`
    };
  })
  .build();
