import { SlateTool } from 'slates';
import { z } from 'zod';
import { getPointagramList, PointagramClient } from '../lib/client';
import { spec } from '../spec';

export let listPlayers = SlateTool.create(spec, {
  name: 'List Players',
  key: 'list_players',
  description: `Retrieves players in your Pointagram account, optionally searching by name, email, or external ID. Returns player details and IDs for player updates and team membership.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      searchBy: z
        .enum(['Email', 'Name', 'External Id'])
        .optional()
        .describe('Player field to search. Provide filter together with this field.'),
      filter: z.string().optional().describe('Search value for the selected searchBy field')
    })
  )
  .output(
    z.object({
      players: z.array(z.any()).describe('List of players in Pointagram')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PointagramClient({
      token: ctx.auth.token,
      apiUser: ctx.auth.apiUser
    });

    let result = await client.listPlayers(ctx.input);
    let players = getPointagramList(result, 'players');

    return {
      output: { players },
      message: `Found **${players.length}** player(s).`
    };
  })
  .build();
