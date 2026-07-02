import { SlateTool } from 'slates';
import { z } from 'zod';
import { BenzingaClient } from '../lib/client';
import { spec } from '../spec';

export let getCalendarEventsTool = SlateTool.create(spec, {
  name: 'Get Calendar Events',
  key: 'get_calendar_events',
  description: `Retrieve financial calendar events including earnings, dividends, analyst ratings, IPOs, guidance, splits, mergers & acquisitions, conference calls, FDA announcements, offerings, and economic events. Supports filtering by ticker, date range, and importance level.`,
  instructions: [
    'Choose one eventType per request. Use tickers to filter by stock symbol, or leave blank for all.',
    'For FDA events, use the tickers field (mapped to securities parameter internally).',
    'Use the importance field (0-5) to filter by significance level where applicable.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      eventType: z
        .enum([
          'earnings',
          'dividends',
          'ratings',
          'ipos',
          'guidance',
          'splits',
          'mergers_acquisitions',
          'conference_calls',
          'fda',
          'offerings',
          'economics'
        ])
        .describe('Type of calendar event to retrieve'),
      tickers: z.string().optional().describe('Comma-separated ticker symbols (max 50)'),
      date: z.string().optional().describe('Specific date to query (YYYY-MM-DD)'),
      dateFrom: z.string().optional().describe('Start date for range (YYYY-MM-DD)'),
      dateTo: z.string().optional().describe('End date for range (YYYY-MM-DD)'),
      importance: z.number().optional().describe('Minimum importance level (0-5)'),
      country: z.string().optional().describe('Country code filter (economics events only)'),
      page: z.number().optional().default(0).describe('Page offset'),
      pageSize: z.number().optional().default(50).describe('Results per page (max 1000)')
    })
  )
  .output(
    z.object({
      events: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of calendar event records'),
      eventType: z.string().describe('Type of events returned'),
      count: z.number().describe('Number of events returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BenzingaClient({ token: ctx.auth.token });
    let { eventType, tickers, date, dateFrom, dateTo, importance, country, page, pageSize } =
      ctx.input;

    let rawData: any;

    let baseParams = { page, pageSize, tickers, date, dateFrom, dateTo, importance };

    switch (eventType) {
      case 'earnings':
        rawData = await client.getCalendarEarnings(baseParams);
        break;
      case 'dividends':
        rawData = await client.getCalendarDividends(baseParams);
        break;
      case 'ratings':
        rawData = await client.getCalendarRatings(baseParams);
        break;
      case 'ipos':
        rawData = await client.getCalendarIPOs(baseParams);
        break;
      case 'guidance':
        rawData = await client.getCalendarGuidance(baseParams);
        break;
      case 'splits':
        rawData = await client.getCalendarSplits(baseParams);
        break;
      case 'mergers_acquisitions':
        rawData = await client.getCalendarMA(baseParams);
        break;
      case 'conference_calls':
        rawData = await client.getCalendarConferenceCalls(baseParams);
        break;
      case 'fda':
        rawData = await client.getCalendarFDA({
          page,
          pageSize,
          securities: tickers,
          date,
          dateFrom,
          dateTo
        });
        break;
      case 'offerings':
        rawData = await client.getCalendarOfferings(baseParams);
        break;
      case 'economics':
        rawData = await client.getCalendarEconomics({
          page,
          pageSize,
          date,
          dateFrom,
          dateTo,
          importance,
          country
        });
        break;
    }

    // Calendar endpoints wrap data in a key matching the type
    let events: any[] = [];
    if (rawData) {
      if (Array.isArray(rawData)) {
        events = rawData;
      } else if (typeof rawData === 'object') {
        // Try common wrapper keys
        let key = Object.keys(rawData).find(k => Array.isArray(rawData[k]));
        events = key ? rawData[key] : [rawData];
      }
    }

    return {
      output: {
        events,
        eventType,
        count: events.length
      },
      message: `Retrieved **${events.length}** ${eventType} event(s)${tickers ? ` for tickers: ${tickers}` : ''}.`
    };
  })
  .build();
