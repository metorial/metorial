import { SlateTool } from 'slates';
import { z } from 'zod';
import { EodhdClient } from '../lib/client';
import { spec } from '../spec';

export let getEconomicEvents = SlateTool.create(spec, {
  name: 'Get Economic Events',
  key: 'get_economic_events',
  description:
    'Retrieve economic releases with actual, previous, and estimated values. Filter by date, country, comparison period, and pagination.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      from: z.string().optional().describe('Start date, YYYY-MM-DD'),
      to: z.string().optional().describe('End date, YYYY-MM-DD'),
      type: z.string().optional().describe('Event type filter, for example GDP Growth Rate'),
      country: z
        .string()
        .optional()
        .describe('ISO two-letter country code, for example US or GB'),
      comparison: z
        .enum(['mom', 'qoq', 'yoy'])
        .optional()
        .describe('Month, quarter, or year-over-year comparison'),
      limit: z.number().optional().describe('Results per page, 0-1000; provider default 50'),
      offset: z.number().optional().describe('Pagination offset, 0-1000; provider default 0')
    })
  )
  .output(
    z.object({
      events: z.array(
        z.object({
          type: z.string().describe('Economic release name'),
          comparison: z.string().nullable().optional().describe('Comparison period'),
          period: z.string().nullable().optional().describe('Reported period'),
          country: z.string().describe('Country code'),
          date: z.string().describe('Event date and time'),
          actual: z.number().nullable().optional().describe('Actual value'),
          previous: z.number().nullable().optional().describe('Previous value'),
          estimate: z.number().nullable().optional().describe('Estimated value'),
          change: z.number().nullable().optional().describe('Change from previous value'),
          change_percentage: z.number().nullable().optional().describe('Percentage change')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new EodhdClient({ token: ctx.auth.token });
    let events = await client.getEconomicEvents(ctx.input);
    return { output: { events }, message: `Retrieved **${events.length}** economic events.` };
  })
  .build();
