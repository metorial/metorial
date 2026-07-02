import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let marketKeySchema = z.object({
  marketKey: z.string().describe('Market key identifier (e.g. "h2h", "player_pass_tds")'),
  lastUpdate: z.string().describe('ISO timestamp of the last update for this market')
});

let bookmakerMarketsSchema = z.object({
  bookmakerKey: z.string().describe('Bookmaker identifier'),
  title: z.string().describe('Bookmaker display name'),
  markets: z.array(marketKeySchema)
});

export let getEventMarketsTool = SlateTool.create(spec, {
  name: 'Get Event Markets',
  key: 'get_event_markets',
  description: `Discover which market keys each bookmaker currently offers for a specific event. Useful for finding available player props and secondary markets before requesting full odds data with the **Get Event Odds** tool.`,
  constraints: ['Costs 1 API credit.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sport: z.string().describe('Sport key (e.g. "basketball_nba")'),
      eventId: z.string().describe('Event ID to discover markets for'),
      regions: z.string().describe('Comma-separated bookmaker regions: us, us2, uk, au, eu'),
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
      bookmakers: z.array(bookmakerMarketsSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { sport, eventId, regions, bookmakers } = ctx.input;

    let e = await client.getEventMarkets({
      sport,
      eventId,
      regions,
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
        markets: b.markets.map(m => ({
          marketKey: m.key,
          lastUpdate: m.last_update
        }))
      }))
    };

    let totalMarkets = result.bookmakers.reduce((sum, b) => sum + b.markets.length, 0);

    return {
      output: result,
      message: `Found **${totalMarkets}** market offerings across **${result.bookmakers.length}** bookmakers for event ${eventId}.`
    };
  })
  .build();
