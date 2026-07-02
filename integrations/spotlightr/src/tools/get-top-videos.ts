import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTopVideos = SlateTool.create(spec, {
  name: 'Get Top Videos',
  key: 'get_top_videos',
  description: `Retrieve a ranked list of top-performing videos based on engagement metrics. You can configure the time window and number of results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      days: z
        .number()
        .optional()
        .describe('Number of days to look back for engagement data. Defaults to 30.'),
      total: z
        .number()
        .optional()
        .describe('Maximum number of top videos to return. Defaults to 3.')
    })
  )
  .output(
    z.object({
      topVideos: z
        .array(z.record(z.string(), z.any()))
        .describe('Ranked list of top-performing videos.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getTopVideos({
      days: ctx.input.days,
      total: ctx.input.total
    });

    let topVideos = Array.isArray(result) ? result : [result];

    return {
      output: {
        topVideos
      },
      message: `Retrieved **${topVideos.length}** top-performing video(s) from the last **${ctx.input.days ?? 30}** days.`
    };
  })
  .build();
