import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { FinageClient } from '../lib/client';
import { finageRecords, validateFinageRange } from '../lib/response';
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
      from: z
        .string()
        .optional()
        .describe(
          'Start date in YYYY-MM-DD format. Required for economic events; earnings are filtered locally.'
        ),
      to: z
        .string()
        .optional()
        .describe(
          'End date in YYYY-MM-DD format. Required for economic events; earnings are filtered locally.'
        )
    })
  )
  .output(
    z.object({
      raw: z.unknown().optional().describe('Original provider response'),
      calendarType: z.string().describe('Calendar type'),
      events: z.array(z.record(z.string(), z.any())).describe('Calendar events')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FinageClient({ token: ctx.auth.token });
    let { calendarType, from, to } = ctx.input;
    validateFinageRange(from, to);
    if (calendarType === 'economic' && (!from || !to)) {
      throw createApiServiceError(
        'Economic calendar requests require both from and to dates.'
      );
    }
    let data =
      calendarType === 'earnings'
        ? await client.getEarningsCalendar()
        : await client.getEconomicCalendar(from, to);
    let events = finageRecords(data, ['events', 'results']);
    if (calendarType === 'earnings' && (from || to)) {
      events = events.filter(event => {
        if (typeof event.date !== 'string')
          throw createApiServiceError('Finage returned an earnings event without a date.');
        let date = event.date.slice(0, 10);
        return (!from || date >= from) && (!to || date <= to);
      });
    }
    return {
      output: { calendarType, events, raw: data },
      message: `Retrieved **${events.length}** ${calendarType} calendar events.`
    };
  })
  .build();
