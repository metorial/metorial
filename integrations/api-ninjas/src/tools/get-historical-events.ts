import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getHistoricalEvents = SlateTool.create(spec, {
  name: 'Get Historical Events',
  key: 'get_historical_events',
  description: `Search for historical events by keyword, date, or both. Find what happened on a specific day in history, or search for events related to a topic. Supports BC/BCE dates using negative year values.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      text: z
        .string()
        .optional()
        .describe('Search keywords or phrase (e.g. "moon landing", "roman empire")'),
      year: z
        .number()
        .optional()
        .describe('4-digit year (use negative for BC/BCE, e.g. -351 for 351 BC)'),
      month: z.number().optional().describe('Month (1-12)'),
      day: z.number().optional().describe('Day of the month')
    })
  )
  .output(
    z.object({
      events: z
        .array(
          z.object({
            year: z.string().describe('Year of the event (negative for BC/BCE)'),
            month: z.string().describe('Month (2-digit)'),
            day: z.string().describe('Day (2-digit)'),
            event: z.string().describe('Description of the event')
          })
        )
        .describe('List of historical events')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let params: Record<string, string | number> = {};
    if (ctx.input.text) params.text = ctx.input.text;
    if (ctx.input.year !== undefined) params.year = ctx.input.year;
    if (ctx.input.month !== undefined) params.month = ctx.input.month;
    if (ctx.input.day !== undefined) params.day = ctx.input.day;

    let result = await client.getHistoricalEvents(params);
    let events = Array.isArray(result) ? result : [result];

    return {
      output: {
        events: events.map((e: any) => ({
          year: String(e.year),
          month: String(e.month),
          day: String(e.day),
          event: e.event
        }))
      },
      message: `Found **${events.length}** historical event(s).${events.length > 0 ? `\n\n**${events[0].year}**: ${events[0].event}` : ''}`
    };
  })
  .build();
