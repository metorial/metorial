import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getImageStats = SlateTool.create(spec, {
  name: 'Get Image Stats',
  key: 'get_image_stats',
  description: `Retrieve aggregated impression statistics for your NiftyImages images. Filter by date range to track performance of personalized images and countdown timers over time.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      startDate: z
        .string()
        .optional()
        .describe(
          'Start date for the stats period in ISO 8601 format (e.g. 2024-01-01T00:00Z).'
        ),
      endDate: z
        .string()
        .optional()
        .describe('End date for the stats period in ISO 8601 format (e.g. 2024-12-31T23:59Z).')
    })
  )
  .output(
    z.object({
      stats: z.any().describe('Aggregated image statistics.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let stats = await client.getImageStats({
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate
    });

    return {
      output: { stats },
      message: `Retrieved image statistics${ctx.input.startDate ? ` from ${ctx.input.startDate}` : ''}${ctx.input.endDate ? ` to ${ctx.input.endDate}` : ''}.`
    };
  })
  .build();
