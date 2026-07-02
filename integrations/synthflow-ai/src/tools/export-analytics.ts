import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let exportAnalytics = SlateTool.create(spec, {
  name: 'Export Analytics',
  key: 'export_analytics',
  description: `Export usage analytics data from Synthflow. Supports datetime-based filtering for precise time-based queries. Returns call metrics and usage summaries.`,
  constraints: ['Keep date ranges under 120 days for optimal performance.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fromDate: z
        .string()
        .optional()
        .describe('Start datetime in ISO format (e.g., "2024-01-01T00:00:00Z")'),
      toDate: z
        .string()
        .optional()
        .describe('End datetime in ISO format (e.g., "2024-03-31T23:59:59Z")')
    })
  )
  .output(
    z.object({
      analytics: z.any().describe('Analytics data export')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.exportAnalytics({
      from_date: ctx.input.fromDate,
      to_date: ctx.input.toDate
    });

    return {
      output: {
        analytics: result.response || result
      },
      message: `Exported analytics${ctx.input.fromDate ? ` from ${ctx.input.fromDate}` : ''}${ctx.input.toDate ? ` to ${ctx.input.toDate}` : ''}.`
    };
  })
  .build();
