import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchPlayers = SlateTool.create(spec, {
  name: 'Search Players',
  key: 'search_players',
  description: `Search for college football players by name. Returns matching player profiles with team, position, and other identifying information. Use this to find player IDs for other queries.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      searchTerm: z.string().describe('Player name or partial name to search for'),
      year: z.number().optional().describe('Filter by season year'),
      team: z.string().optional().describe('Filter by team name'),
      limit: z.number().optional().default(25).describe('Maximum number of results to return')
    })
  )
  .output(
    z.object({
      players: z.array(z.any()).describe('Array of matching player profiles')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let players = await client.searchPlayers(ctx.input);

    let count = Array.isArray(players) ? players.length : 0;
    return {
      output: { players },
      message: `Found **${count}** player(s) matching "${ctx.input.searchTerm}".`
    };
  })
  .build();
