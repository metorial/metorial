import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { eventMarketsSchema, mapEventMarkets } from '../lib/schemas';
import { spec } from '../spec';

export let getHistoricalEventMarketsTool = SlateTool.create(spec, {
  name: 'Get Historical Event Markets',
  key: 'get_historical_event_markets',
  description:
    'Discover which market keys were available for each bookmaker at a historical event snapshot before requesting get_historical_event_odds. Use get_historical_events to discover event IDs.',
  instructions: [
    'Returns market keys seen at the snapshot, rather than every market the provider supports.',
    'The snapshot at or immediately before date is returned.'
  ],
  constraints: ['Historical endpoints require a paid plan.', 'Costs 1 API credit.'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      sport: z.string().describe('Sport key from list_sports'),
      eventId: z.string().describe('Historical event ID from get_historical_events'),
      regions: z.string().describe('Comma-separated bookmaker regions, for example us,uk'),
      date: z
        .string()
        .describe('ISO 8601 snapshot timestamp, for example 2026-10-01T12:00:00Z'),
      bookmakers: z
        .string()
        .optional()
        .describe('Comma-separated bookmaker keys; takes priority over regions')
    })
  )
  .output(
    z.object({
      timestamp: z.string().describe('Actual snapshot timestamp'),
      previousTimestamp: z
        .string()
        .nullable()
        .describe('Previous snapshot timestamp, if available'),
      nextTimestamp: z.string().nullable().describe('Next snapshot timestamp, if available'),
      event: eventMarketsSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let response = await client.getHistoricalEventMarkets(ctx.input);
    return {
      output: {
        timestamp: response.timestamp,
        previousTimestamp: response.previous_timestamp,
        nextTimestamp: response.next_timestamp,
        event: mapEventMarkets(response.data)
      },
      message: `Retrieved historical event market keys at ${response.timestamp}.`
    };
  })
  .build();
