import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let outcomeSchema = z.object({
  name: z.string().describe('Outcome name (team name, "Over", "Under", "Draw", etc.)'),
  price: z.number().describe('Odds price in the requested format'),
  point: z.number().optional().describe('Point spread or total value, if applicable')
});

let marketSchema = z.object({
  marketKey: z.string().describe('Market type key (e.g. h2h, spreads, totals)'),
  lastUpdate: z
    .string()
    .optional()
    .describe('ISO timestamp of the last odds update for this market'),
  outcomes: z.array(outcomeSchema)
});

let bookmakerSchema = z.object({
  bookmakerKey: z.string().describe('Bookmaker identifier'),
  title: z.string().describe('Bookmaker display name'),
  lastUpdate: z.string().describe('ISO timestamp of the last update from this bookmaker'),
  markets: z.array(marketSchema)
});

let eventWithOddsSchema = z.object({
  eventId: z.string().describe('Unique event identifier'),
  sportKey: z.string().describe('Sport key'),
  sportTitle: z.string().describe('Sport display name'),
  commenceTime: z.string().describe('ISO timestamp of event start time'),
  homeTeam: z.string().nullable().describe('Home team name'),
  awayTeam: z.string().nullable().describe('Away team name'),
  bookmakers: z.array(bookmakerSchema)
});

export let getOddsTool = SlateTool.create(spec, {
  name: 'Get Odds',
  key: 'get_odds',
  description: `Retrieve live and upcoming betting odds for a given sport. Returns events with bookmaker odds for the specified regions and markets.
Use \`"upcoming"\` as the sport to get odds across all in-season sports.`,
  instructions: [
    'Use sport keys from the List Sports tool (e.g. "americanfootball_nfl", "soccer_epl").',
    'Specify at least one region. Multiple regions can be comma-separated (e.g. "us,uk").',
    'Markets default to "h2h" (moneyline). Available: h2h, spreads, totals, outrights.'
  ],
  constraints: ['Costs 1 API credit per region per market.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sport: z
        .string()
        .describe('Sport key (e.g. "americanfootball_nfl") or "upcoming" for all sports'),
      regions: z.string().describe('Comma-separated bookmaker regions: us, us2, uk, au, eu'),
      markets: z
        .string()
        .optional()
        .describe('Comma-separated markets: h2h, spreads, totals, outrights (default: h2h)'),
      oddsFormat: z
        .enum(['decimal', 'american'])
        .optional()
        .describe('Odds format (default: decimal)'),
      eventIds: z.string().optional().describe('Comma-separated event IDs to filter'),
      bookmakers: z.string().optional().describe('Comma-separated bookmaker keys to filter'),
      commenceTimeFrom: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp — only include events starting on or after'),
      commenceTimeTo: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp — only include events starting on or before')
    })
  )
  .output(
    z.object({
      events: z.array(eventWithOddsSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let {
      sport,
      regions,
      markets,
      oddsFormat,
      eventIds,
      bookmakers,
      commenceTimeFrom,
      commenceTimeTo
    } = ctx.input;

    let data = await client.getOdds({
      sport,
      regions,
      markets,
      oddsFormat,
      eventIds,
      bookmakers,
      commenceTimeFrom,
      commenceTimeTo
    });

    let events = data.map(e => ({
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
      output: { events },
      message: `Retrieved odds for **${events.length}** events in **${sport}** from regions: ${regions}.`
    };
  })
  .build();
