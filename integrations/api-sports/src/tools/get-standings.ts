import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let standingEntrySchema = z.object({
  rank: z.number().nullable().describe('Position in the standings'),
  teamId: z.number().nullable().describe('Team ID'),
  teamName: z.string().nullable().describe('Team name'),
  teamLogo: z.string().nullable().describe('Team logo URL'),
  points: z.number().nullable().describe('Total points'),
  goalsDiff: z.number().nullable().describe('Goal difference'),
  group: z.string().nullable().describe('Group name (for group stages)'),
  form: z.string().nullable().describe('Recent form (e.g., WWLDW)'),
  played: z.number().nullable().describe('Games played'),
  win: z.number().nullable().describe('Games won'),
  draw: z.number().nullable().describe('Games drawn'),
  lose: z.number().nullable().describe('Games lost'),
  goalsFor: z.number().nullable().describe('Goals scored'),
  goalsAgainst: z.number().nullable().describe('Goals conceded'),
  description: z.string().nullable().describe('Qualification/relegation status')
});

export let getStandingsTool = SlateTool.create(spec, {
  name: 'Get Standings',
  key: 'get_standings',
  description: `Retrieve league standings and tables for a given competition and season. Returns the full ranking with team statistics including points, wins, draws, losses, goals, form, and group information where applicable.`,
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
      seasonName: z
        .string()
        .optional()
        .describe('Exact string basketball season from get_seasons; use instead of season'),
      stage: z.string().optional().describe('Standings stage, where supported'),
      group: z.string().optional().describe('Standings group, where supported'),
      conference: z.string().optional().describe('NFL conference filter'),
      division: z.string().optional().describe('NFL division filter'),
      league: z.number().describe('League ID'),
      season: z.number().describe('Season year'),
      team: z.number().optional().describe('Filter by specific team ID')
    })
  )
  .output(
    z.object({
      raw: z
        .unknown()
        .optional()
        .describe('Complete provider response, including coverage and pagination metadata'),
      standings: z.array(standingEntrySchema),
      leagueName: z.string().nullable().describe('League name'),
      count: z.number().describe('Number of entries')
    })
  )
  .handleInvocation(async ctx => {
    let sport = ctx.input.sport ?? ctx.config.sport;
    let client = new Client({ token: ctx.auth.token, sport });

    let data = await client.getStandings({
      league: ctx.input.league,
      season: ctx.input.seasonName ?? ctx.input.season,
      stage: ctx.input.stage,
      group: ctx.input.group,
      conference: ctx.input.conference,
      division: ctx.input.division,
      team: ctx.input.team
    });

    let leagueName: string | null = null;
    let entries: any[] = [];

    const collect = (item: any): void => {
      if (Array.isArray(item)) {
        item.forEach(collect);
        return;
      }
      leagueName = item.league?.name ?? leagueName;
      const nested = item.league?.standings ?? item.standings;
      if (nested) {
        collect(nested);
        return;
      }
      if (!item.team) return;
      const numeric = (value: any) => (typeof value === 'number' ? value : null);
      entries.push({
        rank: item.rank ?? item.position ?? null,
        teamId: item.team?.id ?? null,
        teamName: item.team?.name ?? null,
        teamLogo: item.team?.logo ?? null,
        points: numeric(item.points),
        goalsDiff: item.goalsDiff ?? null,
        group:
          typeof item.group === 'string'
            ? item.group
            : (item.group?.name ?? item.division ?? null),
        form: item.form ?? null,
        played: item.all?.played ?? item.games?.played ?? null,
        win:
          item.all?.win ??
          numeric(item.games?.win) ??
          item.games?.win?.total ??
          item.won ??
          null,
        draw:
          item.all?.draw ??
          numeric(item.games?.draw) ??
          item.games?.draw?.total ??
          item.ties ??
          null,
        lose:
          item.all?.lose ??
          numeric(item.games?.lose) ??
          item.games?.lose?.total ??
          item.lost ??
          null,
        goalsFor: item.all?.goals?.for ?? null,
        goalsAgainst: item.all?.goals?.against ?? null,
        description: item.description ?? null
      });
    };
    collect(data.response ?? []);

    return {
      output: {
        raw: data,
        standings: entries,
        leagueName,
        count: entries.length
      },
      message: `Retrieved standings for **${leagueName ?? 'league'}** (${ctx.input.season}) with **${entries.length}** entries.`
    };
  })
  .build();
