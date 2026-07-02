import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getGames = SlateTool.create(spec, {
  name: 'Get Games',
  key: 'get_games',
  description: `Retrieve college football game results, scores, and schedule information. Returns game data including home/away teams, scores, venue, attendance, and excitement index. Can be used to look up past results, upcoming schedules, or specific matchups.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      year: z.number().describe('Season year (required)'),
      seasonType: z
        .enum(['regular', 'postseason', 'both'])
        .optional()
        .describe('Type of season games to return'),
      week: z.number().optional().describe('Week number to filter by'),
      team: z.string().optional().describe('Team name to filter by'),
      conference: z
        .string()
        .optional()
        .describe('Conference abbreviation to filter by (e.g. "SEC", "B1G")'),
      classification: z
        .enum(['fbs', 'fcs', 'ii', 'iii'])
        .optional()
        .describe('Division classification'),
      gameId: z.number().optional().describe('Specific game ID to retrieve')
    })
  )
  .output(
    z.object({
      games: z
        .array(z.any())
        .describe('Array of game objects with scores, teams, venue, and metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let games = await client.getGames(ctx.input);

    let count = Array.isArray(games) ? games.length : 0;
    return {
      output: { games },
      message: `Found **${count}** game(s) for the specified filters.`
    };
  })
  .build();
