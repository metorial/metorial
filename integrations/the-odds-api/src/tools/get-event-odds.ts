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

export let getEventOddsTool = SlateTool.create(spec, {
  name: 'Get Event Odds',
  key: 'get_event_odds',
  description: `Retrieve odds for a single event across all available markets and bookmakers. Supports extended markets including player props (e.g. player points, passing touchdowns), alternate spreads/totals, and period-specific markets.
Use the **Get Event Markets** tool first to discover which market keys are available.`,
  instructions: [
    'Use event IDs from the Get Events or Get Odds tools.',
    'Market keys for player props vary by sport (e.g. "player_pass_tds", "player_points").',
    'Multiple markets can be comma-separated.'
  ],
  constraints: ['Costs 1 credit per unique market returned per region.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sport: z.string().describe('Sport key (e.g. "americanfootball_nfl")'),
      eventId: z.string().describe('Event ID to get odds for'),
      regions: z.string().describe('Comma-separated bookmaker regions: us, us2, uk, au, eu'),
      markets: z
        .string()
        .optional()
        .describe('Comma-separated market keys (e.g. "h2h,spreads,player_pass_tds")'),
      oddsFormat: z
        .enum(['decimal', 'american'])
        .optional()
        .describe('Odds format (default: decimal)'),
      bookmakers: z.string().optional().describe('Comma-separated bookmaker keys to filter')
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('Unique event identifier'),
      sportKey: z.string().describe('Sport key'),
      sportTitle: z.string().describe('Sport display name'),
      commenceTime: z.string().describe('ISO timestamp of event start time'),
      homeTeam: z.string().nullable().describe('Home team name'),
      awayTeam: z.string().nullable().describe('Away team name'),
      bookmakers: z.array(bookmakerSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { sport, eventId, regions, markets, oddsFormat, bookmakers } = ctx.input;

    let e = await client.getEventOdds({
      sport,
      eventId,
      regions,
      markets,
      oddsFormat,
      bookmakers
    });

    let result = {
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
    };

    let matchup = e.home_team && e.away_team ? `${e.home_team} vs ${e.away_team}` : eventId;

    return {
      output: result,
      message: `Retrieved odds for **${matchup}** from **${result.bookmakers.length}** bookmakers.`
    };
  })
  .build();
