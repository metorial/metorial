import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let oddValueSchema = z.object({
  value: z
    .string()
    .nullable()
    .describe('Bet selection (e.g., "Home", "Draw", "Away", "Over 2.5")'),
  odd: z.string().nullable().describe('Odds value')
});

let bookmakerOddsSchema = z.object({
  bookmakerName: z.string().nullable().describe('Bookmaker name'),
  bookmakerId: z.number().nullable().describe('Bookmaker ID'),
  bets: z
    .array(
      z.object({
        betName: z
          .string()
          .nullable()
          .describe('Bet type name (e.g., "Match Winner", "Over/Under")'),
        betId: z.number().nullable().describe('Bet type ID'),
        values: z.array(oddValueSchema).describe('Available odds for this bet type')
      })
    )
    .describe('Available bet types and odds')
});

let fixtureOddsSchema = z.object({
  fixtureId: z.number().nullable().describe('Fixture ID'),
  leagueName: z.string().nullable().describe('League name'),
  leagueId: z.number().nullable().describe('League ID'),
  date: z.string().nullable().describe('Fixture date'),
  bookmakers: z.array(bookmakerOddsSchema).describe('Odds from each bookmaker')
});

export let getOddsTool = SlateTool.create(spec, {
  name: 'Get Odds',
  key: 'get_odds',
  description: `Retrieve pre-match betting odds from multiple bookmakers. Filter by fixture, league, season, or date. Returns odds for various bet types (match winner, over/under, both teams to score, etc.) across all available bookmakers.`,
  instructions: [
    'Provide either a fixtureId or a combination of league + season to query odds.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sport: z
        .enum([
          'football',
          'basketball',
          'baseball',
          'hockey',
          'rugby',
          'handball',
          'volleyball',
          'afl',
          'nba',
          'nfl',
          'formula-1',
          'mma'
        ])
        .optional()
        .describe('Sport to query. Defaults to the configured sport.'),
      fixture: z.number().optional().describe('Fixture ID to get odds for'),
      league: z.number().optional().describe('League ID'),
      season: z.number().optional().describe('Season year'),
      date: z.string().optional().describe('Date filter (YYYY-MM-DD)'),
      bookmaker: z.number().optional().describe('Filter by bookmaker ID'),
      bet: z.number().optional().describe('Filter by bet type ID'),
      page: z.number().optional().describe('Page number for paginated results'),
      timezone: z.string().optional().describe('Timezone for dates')
    })
  )
  .output(
    z.object({
      odds: z.array(fixtureOddsSchema),
      count: z.number().describe('Number of fixtures with odds')
    })
  )
  .handleInvocation(async ctx => {
    let sport = ctx.input.sport ?? ctx.config.sport;
    let client = new Client({ token: ctx.auth.token, sport });

    let data = await client.getOdds({
      fixture: ctx.input.fixture,
      league: ctx.input.league,
      season: ctx.input.season,
      date: ctx.input.date,
      bookmaker: ctx.input.bookmaker,
      bet: ctx.input.bet,
      page: ctx.input.page,
      timezone: ctx.input.timezone
    });

    let results = (data.response ?? []).map((item: any) => ({
      fixtureId: item.fixture?.id ?? null,
      leagueName: item.league?.name ?? null,
      leagueId: item.league?.id ?? null,
      date: item.fixture?.date ?? null,
      bookmakers: (item.bookmakers ?? []).map((bk: any) => ({
        bookmakerName: bk.name ?? null,
        bookmakerId: bk.id ?? null,
        bets: (bk.bets ?? []).map((bet: any) => ({
          betName: bet.name ?? null,
          betId: bet.id ?? null,
          values: (bet.values ?? []).map((v: any) => ({
            value: v.value ?? null,
            odd: v.odd ?? null
          }))
        }))
      }))
    }));

    return {
      output: {
        odds: results,
        count: results.length
      },
      message: `Retrieved odds for **${results.length}** fixture(s).`
    };
  })
  .build();
