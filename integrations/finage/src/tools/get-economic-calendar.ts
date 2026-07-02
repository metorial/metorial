import { SlateTool } from 'slates';
import { z } from 'zod';
import { FinageClient } from '../lib/client';
import { spec } from '../spec';

export let getEconomicCalendar = SlateTool.create(spec, {
  name: 'Get Economic Calendar',
  key: 'get_economic_calendar',
  description: `Retrieve upcoming and recent economic events, earnings reports, and other scheduled financial events. Filter by date range to see what's happening in the global economy.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      calendarType: z
        .enum(['economic', 'earnings'])
        .default('economic')
        .describe('Type of calendar to retrieve'),
      from: z.string().optional().describe('Start date in YYYY-MM-DD format'),
      to: z.string().optional().describe('End date in YYYY-MM-DD format')
    })
  )
  .output(
    z.object({
      calendarType: z.string().describe('Calendar type'),
      events: z.array(z.record(z.string(), z.any())).describe('Calendar events')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FinageClient({ token: ctx.auth.token });
    let { calendarType, from, to } = ctx.input;

    let data: any;
    if (calendarType === 'earnings') {
      data = await client.getEarningsCalendar(from, to);
    } else {
      data = await client.getEconomicCalendar(from, to);
    }

    let events = Array.isArray(data) ? data : data?.events || data?.results || [];

    return {
      output: {
        calendarType,
        events
      },
      message: `Retrieved **${events.length}** ${calendarType} calendar events${from ? ` from ${from}` : ''}${to ? ` to ${to}` : ''}.`
    };
  })
  .build();
