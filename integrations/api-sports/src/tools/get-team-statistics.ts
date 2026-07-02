import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTeamStatisticsTool = SlateTool.create(spec, {
  name: 'Get Team Statistics',
  key: 'get_team_statistics',
  description: `Retrieve aggregated season statistics for a specific team in a given league. Returns overall record, goals analysis, streaks, form, and performance data. Primarily for football; requires league, season, and team IDs.`,
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
      league: z.number().describe('League ID'),
      season: z.number().describe('Season year'),
      team: z.number().describe('Team ID'),
      date: z.string().optional().describe('Calculate statistics up to this date (YYYY-MM-DD)')
    })
  )
  .output(
    z.object({
      teamName: z.string().nullable().describe('Team name'),
      teamLogo: z.string().nullable().describe('Team logo URL'),
      leagueName: z.string().nullable().describe('League name'),
      form: z.string().nullable().describe('Current form string (e.g., WWDLW)'),
      fixturesPlayed: z.number().nullable().describe('Total fixtures played'),
      fixturesWins: z.number().nullable().describe('Total wins'),
      fixturesDraws: z.number().nullable().describe('Total draws'),
      fixturesLosses: z.number().nullable().describe('Total losses'),
      goalsFor: z.number().nullable().describe('Total goals scored'),
      goalsAgainst: z.number().nullable().describe('Total goals conceded'),
      cleanSheets: z.number().nullable().describe('Total clean sheets'),
      failedToScore: z.number().nullable().describe('Games failed to score'),
      biggestWinHome: z.string().nullable().describe('Biggest home win'),
      biggestWinAway: z.string().nullable().describe('Biggest away win'),
      biggestLossHome: z.string().nullable().describe('Biggest home loss'),
      biggestLossAway: z.string().nullable().describe('Biggest away loss'),
      longestWinStreak: z.number().nullable().describe('Longest winning streak'),
      longestDrawStreak: z.number().nullable().describe('Longest draw streak'),
      longestLossStreak: z.number().nullable().describe('Longest losing streak'),
      penaltiesScored: z.number().nullable().describe('Penalties scored'),
      penaltiesMissed: z.number().nullable().describe('Penalties missed')
    })
  )
  .handleInvocation(async ctx => {
    let sport = ctx.input.sport ?? ctx.config.sport;
    let client = new Client({ token: ctx.auth.token, sport });

    let data = await client.getTeamStatistics({
      league: ctx.input.league,
      season: ctx.input.season,
      team: ctx.input.team,
      date: ctx.input.date
    });

    let r = data.response ?? {};
    let fixtures = r.fixtures ?? {};
    let goals = r.goals ?? {};
    let biggest = r.biggest ?? {};

    let output = {
      teamName: r.team?.name ?? null,
      teamLogo: r.team?.logo ?? null,
      leagueName: r.league?.name ?? null,
      form: r.form ?? null,
      fixturesPlayed: fixtures.played?.total ?? null,
      fixturesWins: fixtures.wins?.total ?? null,
      fixturesDraws: fixtures.draws?.total ?? null,
      fixturesLosses: fixtures.loses?.total ?? null,
      goalsFor: goals.for?.total?.total ?? null,
      goalsAgainst: goals.against?.total?.total ?? null,
      cleanSheets: r.clean_sheet?.total ?? null,
      failedToScore: r.failed_to_score?.total ?? null,
      biggestWinHome: biggest.wins?.home ?? null,
      biggestWinAway: biggest.wins?.away ?? null,
      biggestLossHome: biggest.loses?.home ?? null,
      biggestLossAway: biggest.loses?.away ?? null,
      longestWinStreak: biggest.streak?.wins ?? null,
      longestDrawStreak: biggest.streak?.draws ?? null,
      longestLossStreak: biggest.streak?.loses ?? null,
      penaltiesScored: r.penalty?.scored?.total ?? null,
      penaltiesMissed: r.penalty?.missed?.total ?? null
    };

    return {
      output,
      message: `Team stats for **${output.teamName ?? 'team'}** in ${output.leagueName ?? 'league'} (${ctx.input.season}): ${output.fixturesWins ?? 0}W ${output.fixturesDraws ?? 0}D ${output.fixturesLosses ?? 0}L, GF: ${output.goalsFor ?? 0}, GA: ${output.goalsAgainst ?? 0}.`
    };
  })
  .build();
