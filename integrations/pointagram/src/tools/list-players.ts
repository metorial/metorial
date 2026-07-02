import { SlateTool } from 'slates';
import { z } from 'zod';
import { PointagramClient } from '../lib/client';
import { spec } from '../spec';

export let listPlayers = SlateTool.create(spec, {
  name: 'List Players',
  key: 'list_players',
  description: `Retrieves all players in your Pointagram account. Returns player details including names, emails, external IDs, and their current status.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
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

    let result = await client.listPlayers();
    let players = Array.isArray(result) ? result : (result?.players ?? [result]);

    return {
      output: { players },
      message: `Found **${players.length}** player(s).`
    };
  })
  .build();
