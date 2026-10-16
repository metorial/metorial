import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let fixtureSchema = z.object({
  fixtureId: z.number().describe('Unique fixture ID'),
  referee: z.string().nullable().describe('Referee name'),
  date: z.string().nullable().describe('Match date and time (ISO 8601)'),
  timestamp: z.number().nullable().describe('Unix timestamp of the match'),
  venueName: z.string().nullable().describe('Venue name'),
  venueCity: z.string().nullable().describe('Venue city'),
  statusLong: z.string().nullable().describe('Full status description'),
  statusShort: z.string().nullable().describe('Short status code (e.g., FT, NS, 1H)'),
  elapsed: z.number().nullable().describe('Elapsed minutes for live games'),
  leagueId: z.number().nullable().describe('League ID'),
  leagueName: z.string().nullable().describe('League name'),
  leagueSeason: z.union([z.number(), z.string()]).nullable().describe('Season year'),
  leagueRound: z.string().nullable().describe('Round or matchday'),
  homeTeamId: z.number().nullable().describe('Home team ID'),
  homeTeamName: z.string().nullable().describe('Home team name'),
  homeTeamLogo: z.string().nullable().describe('Home team logo URL'),
  awayTeamId: z.number().nullable().describe('Away team ID'),
  awayTeamName: z.string().nullable().describe('Away team name'),
  awayTeamLogo: z.string().nullable().describe('Away team logo URL'),
  homeGoals: z.number().nullable().describe('Home team goals/score'),
  awayGoals: z.number().nullable().describe('Away team goals/score'),
  homeScoreHalftime: z.number().nullable().describe('Home team halftime score'),
  awayScoreHalftime: z.number().nullable().describe('Away team halftime score')
});

export let getFixturesTool = SlateTool.create(spec, {
  name: 'Get Fixtures',
  key: 'get_fixtures',
  description: `Retrieve match fixtures, results, and schedules. Supports filtering by league, team, date range, status, and round. Filters vary by sport: football supports date ranges and last/next; most other team sports use an ID, date, league, season or team. NBA uses nbaLeague names. Formula 1 returns races and MMA returns fights; their complete details are retained in raw. Can also retrieve live games by setting **live** to true.`,
  instructions: [
    'Provide at least one filter (league, team, date, fixtureId, or live) to avoid overly broad queries.',
    'Date format is YYYY-MM-DD. Date ranges use "from" and "to" parameters.'
  ],
  constraints: [
    'The API may limit results per request. Use specific filters to narrow results.'
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
      nbaLeague: z
        .string()
        .optional()
        .describe('NBA league name from get_nba_leagues; use instead of numeric league'),
      seasonName: z
        .string()
        .optional()
        .describe(
          'Exact string season from get_seasons for basketball; use instead of season'
        ),
      fighter: z.number().optional().describe('MMA fighter ID from get_player_stats'),
      category: z.string().optional().describe('MMA weight category'),
      fixtureId: z.number().optional().describe('Get a specific fixture by ID'),
      live: z.boolean().optional().describe('Set to true to get only live/in-play matches'),
      league: z.number().optional().describe('League ID to filter by'),
      season: z.number().optional().describe('Season year'),
      team: z.number().optional().describe('Team ID to filter by'),
      date: z.string().optional().describe('Specific date (YYYY-MM-DD)'),
      from: z.string().optional().describe('Start date for range (YYYY-MM-DD)'),
      to: z.string().optional().describe('End date for range (YYYY-MM-DD)'),
      round: z.string().optional().describe('Round or matchday filter'),
      status: z
        .string()
        .optional()
        .describe('Match status filter (e.g., NS, 1H, HT, 2H, FT, LIVE)'),
      timezone: z.string().optional().describe('Timezone for dates (e.g., Europe/London)'),
      last: z.number().optional().describe('Get last N fixtures for a team'),
      next: z.number().optional().describe('Get next N fixtures for a team')
    })
  )
  .output(
    z.object({
      raw: z
        .unknown()
        .optional()
        .describe('Complete provider response, including coverage and pagination metadata'),
      fixtures: z.array(fixtureSchema),
      count: z.number().describe('Number of fixtures returned')
    })
  )
  .handleInvocation(async ctx => {
    let sport = ctx.input.sport ?? ctx.config.sport;
    let client = new Client({ token: ctx.auth.token, sport });

    let isFootball = sport === 'football';
    let params: any = {
      league: ctx.input.nbaLeague ?? ctx.input.league,
      season: ctx.input.seasonName ?? ctx.input.season,
      fighter: ctx.input.fighter,
      category: ctx.input.category,
      team: ctx.input.team,
      date: ctx.input.date,
      from: ctx.input.from,
      to: ctx.input.to,
      round: ctx.input.round,
      status: ctx.input.status,
      timezone: ctx.input.timezone,
      last: ctx.input.last,
      next: ctx.input.next
    };

    if (ctx.input.fixtureId !== undefined) {
      params.id = ctx.input.fixtureId;
    }
    if (ctx.input.live) {
      params.live = 'all';
    }

    let data: any;
    if (isFootball) {
      data = await client.getFootballFixtures(params);
    } else {
      data = await client.getFixtures(params);
    }

    let results = (data.response ?? []).map((item: any) => {
      if (isFootball) {
        let fixture = item.fixture ?? {};
        let league = item.league ?? {};
        let teams = item.teams ?? {};
        let goals = item.goals ?? {};
        let score = item.score ?? {};
        return {
          fixtureId: fixture.id,
          referee: fixture.referee ?? null,
          date: fixture.date ?? null,
          timestamp: fixture.timestamp ?? null,
          venueName: fixture.venue?.name ?? null,
          venueCity: fixture.venue?.city ?? null,
          statusLong: fixture.status?.long ?? null,
          statusShort: fixture.status?.short ?? null,
          elapsed: fixture.status?.elapsed ?? null,
          leagueId: league.id ?? null,
          leagueName: league.name ?? null,
          leagueSeason: league.season ?? null,
          leagueRound: league.round ?? null,
          homeTeamId: teams.home?.id ?? null,
          homeTeamName: teams.home?.name ?? null,
          homeTeamLogo: teams.home?.logo ?? null,
          awayTeamId: teams.away?.id ?? null,
          awayTeamName: teams.away?.name ?? null,
          awayTeamLogo: teams.away?.logo ?? null,
          homeGoals: goals.home ?? null,
          awayGoals: goals.away ?? null,
          homeScoreHalftime: score.halftime?.home ?? null,
          awayScoreHalftime: score.halftime?.away ?? null
        };
      }
      const fixture = item.game ?? item;
      const gameDate = fixture.date;
      const score = (value: any) =>
        typeof value === 'number' ? value : (value?.total ?? value?.points ?? null);
      return {
        fixtureId: fixture.id,
        referee: typeof fixture.referee === 'string' ? fixture.referee : null,
        date:
          typeof gameDate === 'string'
            ? gameDate
            : (gameDate?.start ?? gameDate?.date ?? null),
        timestamp: fixture.timestamp ?? gameDate?.timestamp ?? null,
        venueName: fixture.venue?.name ?? item.arena?.name ?? item.circuit?.name ?? null,
        venueCity: fixture.venue?.city ?? item.arena?.city ?? null,
        statusLong:
          fixture.status?.long ?? (typeof fixture.status === 'string' ? fixture.status : null),
        statusShort: fixture.status?.short != null ? String(fixture.status.short) : null,
        elapsed:
          typeof fixture.status?.timer === 'number'
            ? fixture.status.timer
            : typeof item.timer === 'number'
              ? item.timer
              : null,
        leagueId: item.league?.id ?? null,
        leagueName:
          typeof item.league === 'string' ? item.league : (item.league?.name ?? null),
        leagueSeason: item.league?.season ?? item.season ?? null,
        leagueRound: fixture.week ?? item.week ?? null,
        homeTeamId: item.teams?.home?.id ?? null,
        homeTeamName: item.teams?.home?.name ?? null,
        homeTeamLogo: item.teams?.home?.logo ?? null,
        awayTeamId: item.teams?.away?.id ?? item.teams?.visitors?.id ?? null,
        awayTeamName: item.teams?.away?.name ?? item.teams?.visitors?.name ?? null,
        awayTeamLogo: item.teams?.away?.logo ?? item.teams?.visitors?.logo ?? null,
        homeGoals: score(item.scores?.home),
        awayGoals: score(item.scores?.away ?? item.scores?.visitors),
        homeScoreHalftime: null,
        awayScoreHalftime: null
      };
    });

    return {
      output: {
        raw: data,
        fixtures: results,
        count: results.length
      },
      message: ctx.input.live
        ? `Found **${results.length}** live fixture(s) for **${sport}**.`
        : `Found **${results.length}** fixture(s) for **${sport}**.`
    };
  })
  .build();
