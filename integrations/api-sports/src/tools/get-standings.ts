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
      league: z.number().describe('League ID'),
      season: z.number().describe('Season year'),
      team: z.number().optional().describe('Filter by specific team ID')
    })
  )
  .output(
    z.object({
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
      season: ctx.input.season,
      team: ctx.input.team
    });

    let leagueName: string | null = null;
    let entries: any[] = [];

    let responseArr = data.response ?? [];
    for (let item of responseArr) {
      leagueName = item.league?.name ?? leagueName;
      let standingsGroups = item.league?.standings ?? item.standings ?? [];
      for (let group of standingsGroups) {
        if (Array.isArray(group)) {
          for (let entry of group) {
            entries.push({
              rank: entry.rank ?? null,
              teamId: entry.team?.id ?? null,
              teamName: entry.team?.name ?? null,
              teamLogo: entry.team?.logo ?? null,
              points: entry.points ?? null,
              goalsDiff: entry.goalsDiff ?? null,
              group: entry.group ?? null,
              form: entry.form ?? null,
              played: entry.all?.played ?? entry.games?.played ?? null,
              win: entry.all?.win ?? entry.games?.win?.total ?? null,
              draw: entry.all?.draw ?? entry.games?.draw?.total ?? null,
              lose: entry.all?.lose ?? entry.games?.lose?.total ?? null,
              goalsFor: entry.all?.goals?.for ?? null,
              goalsAgainst: entry.all?.goals?.against ?? null,
              description: entry.description ?? null
            });
          }
        }
      }
    }

    return {
      output: {
        standings: entries,
        leagueName,
        count: entries.length
      },
      message: `Retrieved standings for **${leagueName ?? 'league'}** (${ctx.input.season}) with **${entries.length}** entries.`
    };
  })
  .build();
