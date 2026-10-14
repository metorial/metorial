import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { assertGenerationSucceeded, Client } from '../lib/client';
import { spec } from '../spec';

export let getVideoResult = SlateTool.create(spec, {
  name: 'Get Video Result',
  key: 'get_video_result',
  description:
    'Check an existing video generation task and download its video when completed. Use the generationId returned by generate_video.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      generationId: z.string().min(1).describe('Generation ID returned by generate_video')
    })
  )
  .output(
    z.object({
      generationId: z.string(),
      status: z.string(),
      videoUrl: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    let result = await client.getVideoResult(ctx.input.generationId);
    assertGenerationSucceeded(result, 'Video');
    if (result.status === 'completed') {
      if (!result.video?.url) {
        throw createApiServiceError(
          'AI/ML API reported a completed video without a download URL. Try retrieving the result again.'
        );
      }
      await ctx.addAttachment({ type: 'url', url: result.video.url, mimeType: 'video/mp4' });
    }
    return {
      output: {
        generationId: ctx.input.generationId,
        status: result.status,
        videoUrl: result.video?.url
      },
      message: `Video generation status: **${result.status}**.`
    };
  })
  .build();
