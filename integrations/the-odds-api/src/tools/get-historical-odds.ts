import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let outcomeSchema = z.object({
  name: z.string().describe('Outcome name'),
  price: z.number().describe('Odds price'),
  point: z.number().optional().describe('Point spread or total value')
});

let marketSchema = z.object({
  marketKey: z.string().describe('Market type key'),
  lastUpdate: z.string().optional().describe('ISO timestamp of the last odds update'),
  outcomes: z.array(outcomeSchema)
});

let bookmakerSchema = z.object({
  bookmakerKey: z.string().describe('Bookmaker identifier'),
  title: z.string().describe('Bookmaker display name'),
  lastUpdate: z.string().describe('ISO timestamp of the last update'),
  markets: z.array(marketSchema)
});

let eventSchema = z.object({
  eventId: z.string().describe('Unique event identifier'),
  sportKey: z.string().describe('Sport key'),
  sportTitle: z.string().describe('Sport display name'),
  commenceTime: z.string().describe('ISO timestamp of event start time'),
  homeTeam: z.string().nullable().describe('Home team name'),
  awayTeam: z.string().nullable().describe('Away team name'),
  bookmakers: z.array(bookmakerSchema)
});

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
      sport: z.string().describe('Sport key (e.g. "americanfootball_nfl")'),
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
      events: z.array(eventSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { sport, regions, markets, date, oddsFormat, eventIds, bookmakers } = ctx.input;

    let response = await client.getHistoricalOdds({
      sport,
      regions,
      markets,
      date,
      oddsFormat,
      eventIds,
      bookmakers
    });

    let events = response.data.map(e => ({
      eventId: e.id,
      sportKey: e.sport_key,
      sportTitle: e.sport_title,
      commenceTime: e.commence_time,
      homeTeam: e.home_team,
      awayTeam: e.away_team,
      bookmakers: e.bookmakers.map(b => ({
        bookmakerKey: b.key,
        title: b.title,
        lastUpdate: b.last_update,
        markets: b.markets.map(m => ({
          marketKey: m.key,
          lastUpdate: m.last_update,
          outcomes: m.outcomes.map(o => ({
            name: o.name,
            price: o.price,
            point: o.point
          }))
        }))
      }))
    }));

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
