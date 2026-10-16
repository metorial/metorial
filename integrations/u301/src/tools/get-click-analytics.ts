import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { clicksSchema, workspaceIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getClickAnalytics = SlateTool.create(spec, {
  name: 'Get Click Analytics',
  key: 'get_click_analytics',
  description:
    'Retrieve daily or hourly clicks across all short links in a workspace for a recent date range. Call list_workspaces to discover workspace IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      workspaceId: workspaceIdSchema,
      range: z
        .enum(['24h', '1d', '3d', '7d', '14d', '30d', '60d', '1m'])
        .describe(
          'Recent time range; 1d starts today and 1m starts this calendar month in the selected timezone.'
        ),
      granularity: z.enum(['day', 'hour']).describe('Aggregate clicks by day or hour.'),
      timezone: z
        .string()
        .optional()
        .describe('IANA timezone, for example Europe/London. U301 defaults to UTC.')
    })
  )
  .output(clicksSchema)
  .handleInvocation(async ctx => {
    let output = await new Client({ token: ctx.auth.token }).getClickAnalytics(ctx.input);
    return {
      output,
      message: `Retrieved click activity from ${output.start} to ${output.end}.`
    };
  })
  .build();
