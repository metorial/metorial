import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { eventWithOddsSchema, mapEventWithOdds } from '../lib/schemas';
import { spec } from '../spec';

export let getHistoricalEventOddsTool = SlateTool.create(spec, {
  name: 'Get Historical Event Odds',
  key: 'get_historical_event_odds',
  description:
    'Retrieve an individual event’s historical odds, including player props, alternate lines and period markets. Discover the event ID with get_historical_events and available market keys with get_historical_event_markets.',
  instructions: [
    'Use sport keys from list_sports and historical event IDs from get_historical_events.',
    'The snapshot at or immediately before date is returned. Use previousTimestamp and nextTimestamp to navigate.',
    'Use get_historical_odds for sport-wide featured markets.'
  ],
  constraints: [
    'Historical endpoints require a paid plan.',
    'Additional markets are available after 2023-05-03T05:30:00Z.',
    'Costs 10 credits per unique returned market per region.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      sport: z.string().describe('Sport key from list_sports'),
      eventId: z.string().describe('Historical event ID from get_historical_events'),
      regions: z.string().describe('Comma-separated bookmaker regions, for example us,uk'),
      markets: z
        .string()
        .describe('Comma-separated market keys from get_historical_event_markets'),
      date: z
        .string()
        .describe('ISO 8601 snapshot timestamp, for example 2026-10-01T12:00:00Z'),
      oddsFormat: z
        .enum(['decimal', 'american'])
        .optional()
        .describe('Odds format; defaults to decimal'),
      bookmakers: z
        .string()
        .optional()
        .describe('Comma-separated bookmaker keys; takes priority over regions'),
      includeRotationNumbers: z
        .boolean()
        .optional()
        .describe('Include home and away rotation numbers when available')
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
      event: eventWithOddsSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let response = await client.getHistoricalEventOdds(ctx.input);
    return {
      output: {
        timestamp: response.timestamp,
        previousTimestamp: response.previous_timestamp,
        nextTimestamp: response.next_timestamp,
        event: mapEventWithOdds(response.data)
      },
      message: `Retrieved historical event odds at ${response.timestamp}.`
    };
  })
  .build();
