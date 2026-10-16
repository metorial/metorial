import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

const client = (token: string) => new Client({ token, sport: 'nba' });
const rawOutput = z.object({
  data: z.unknown().describe('Original NBA records, including all statistical fields'),
  raw: z.unknown().describe('Complete provider response')
});

export const getNbaLeaguesTool = SlateTool.create(spec, {
  key: 'get_nba_leagues',
  name: 'Get NBA Leagues',
  description:
    'Discover NBA league variant names, such as the main competition and summer leagues. Pass these exact strings to NBA tools and nbaLeague filters.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(z.object({ leagues: z.array(z.string()), raw: z.unknown() }))
  .handleInvocation(async ctx => {
    const data = await client(ctx.auth.token).getNbaLeagues();
    return {
      output: { leagues: data.response, raw: data },
      message: 'Retrieved available NBA league variants.'
    };
  })
  .build();

export const getNbaStandingsTool = SlateTool.create(spec, {
  key: 'get_nba_standings',
  name: 'Get NBA Standings',
  description:
    'Retrieve NBA conference and division standings, wins, losses, percentages and streaks for a named league and season.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      league: z.string().describe('Exact league name from get_nba_leagues'),
      season: z.number().describe('Four-digit year from get_seasons with sport nba'),
      team: z.number().optional().describe('Team ID from search_teams with sport nba'),
      conference: z.string().optional(),
      division: z.string().optional()
    })
  )
  .output(rawOutput)
  .handleInvocation(async ctx => {
    const data = await client(ctx.auth.token).getNbaStandings(ctx.input);
    return { output: { data: data.response, raw: data }, message: 'Retrieved NBA standings.' };
  })
  .build();

export const getNbaTeamStatisticsTool = SlateTool.create(spec, {
  key: 'get_nba_team_statistics',
  name: 'Get NBA Team Statistics',
  description:
    'Retrieve NBA team season totals for scoring, shooting, rebounds, assists and other available metrics. Optionally filter a season stage.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      id: z.number().describe('Team ID from search_teams with sport nba'),
      season: z.number().describe('Four-digit season year'),
      stage: z.number().optional().describe('NBA season stage')
    })
  )
  .output(rawOutput)
  .handleInvocation(async ctx => {
    const data = await client(ctx.auth.token).getNbaTeamStatistics(ctx.input);
    return {
      output: { data: data.response, raw: data },
      message: 'Retrieved NBA team season statistics.'
    };
  })
  .build();

export const getNbaPlayerStatisticsTool = SlateTool.create(spec, {
  key: 'get_nba_player_statistics',
  name: 'Get NBA Player Statistics',
  description:
    'Retrieve original NBA player game statistics by player, game, team or season, including points, minutes, shooting, rebounds and assists. Provide at least one filter.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      id: z.number().optional().describe('Player ID from get_player_stats with sport nba'),
      game: z.number().optional().describe('Game ID from get_fixtures with sport nba'),
      team: z.number().optional(),
      season: z.number().optional()
    })
  )
  .output(rawOutput)
  .handleInvocation(async ctx => {
    const data = await client(ctx.auth.token).getNbaPlayerStatistics(ctx.input);
    return {
      output: { data: data.response, raw: data },
      message: 'Retrieved NBA player game statistics.'
    };
  })
  .build();
