import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

const output = z.object({
  data: z.unknown().describe('Complete original football records'),
  raw: z.unknown().describe('Complete provider response')
});

export const getFootballSquadsTool = SlateTool.create(spec, {
  key: 'get_football_squads',
  name: 'Get Football Squads',
  description:
    'Retrieve a football team’s current squad, or the teams associated with a player. Provide a team ID or player ID.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      team: z.number().optional().describe('Team ID from search_teams'),
      player: z.number().optional().describe('Player ID from get_player_stats')
    })
  )
  .output(output)
  .handleInvocation(async ctx => {
    const data = await new Client({
      token: ctx.auth.token,
      sport: 'football'
    }).getFootballSquads(ctx.input);
    return {
      output: { data: data.response, raw: data },
      message: 'Retrieved football squad information.'
    };
  })
  .build();

export const getFootballTopScorersTool = SlateTool.create(spec, {
  key: 'get_football_top_scorers',
  name: 'Get Football Top Scorers',
  description:
    'Retrieve the football top scorers for a league and season, including original player profiles and statistics.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      league: z.number().describe('League ID from search_leagues'),
      season: z.number().describe('Four-digit season year from get_seasons')
    })
  )
  .output(output)
  .handleInvocation(async ctx => {
    const data = await new Client({
      token: ctx.auth.token,
      sport: 'football'
    }).getFootballTopScorers(ctx.input);
    return {
      output: { data: data.response, raw: data },
      message: 'Retrieved football top scorers.'
    };
  })
  .build();
