import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapEventWithOdds, sportOddsSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getHistoricalOddsTool = SlateTool.create(spec, {
  name: 'Get Historical Odds',
  key: 'get_historical_odds',
  description: `Retrieve a historical snapshot of betting odds at a specific point in time. Snapshots are captured at 5-10 minute intervals dating back to June 2020. Includes navigation timestamps for iterating through time.`,
  instructions: [
    'Use ISO 8601 format for the date parameter (e.g. "2023-10-15T12:00:00Z").',
    'Use previousTimestamp and nextTimestamp to navigate between snapshots.'
  ],
  constraints: [
    'Costs 10 API credits per region per market.',
    'Only available on paid plans.',
    'Data available from June 6, 2020 onwards.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeRotationNumbers: z
        .boolean()
        .optional()
        .describe('Include home and away rotation numbers when available'),
      sport: z.string().describe('Sport key from list_sports (e.g. "americanfootball_nfl")'),
      regions: z.string().describe('Comma-separated bookmaker regions: us, us2, uk, au, eu'),
      markets: z.string().describe('Comma-separated markets: h2h, spreads, totals, outrights'),
      date: z
        .string()
        .describe('ISO 8601 timestamp for the snapshot (e.g. "2023-10-15T12:00:00Z")'),
      oddsFormat: z
        .enum(['decimal', 'american'])
        .optional()
        .describe('Odds format (default: decimal)'),
      eventIds: z.string().optional().describe('Comma-separated event IDs to filter'),
      bookmakers: z.string().optional().describe('Comma-separated bookmaker keys to filter')
    })
  )
  .output(
    z.object({
      timestamp: z.string().describe('Actual timestamp of the snapshot returned'),
      previousTimestamp: z
        .string()
        .nullable()
        .describe('Timestamp of the previous snapshot (null if none)'),
      nextTimestamp: z
        .string()
        .nullable()
        .describe('Timestamp of the next snapshot (null if none)'),
      events: z.array(sportOddsSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { sport, regions, markets, date, oddsFormat, eventIds, bookmakers } = ctx.input;

    let response = await client.getHistoricalOdds({
      includeRotationNumbers: ctx.input.includeRotationNumbers,
      sport,
      regions,
      markets,
      date,
      oddsFormat,
      eventIds,
      bookmakers
    });

    let events = response.data.map(event => mapEventWithOdds(event));

    return {
      output: {
        timestamp: response.timestamp,
        previousTimestamp: response.previous_timestamp,
        nextTimestamp: response.next_timestamp,
        events
      },
      message: `Retrieved historical odds snapshot at **${response.timestamp}** with **${events.length}** events.`
    };
  })
  .build();
