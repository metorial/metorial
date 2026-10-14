import { isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { PointagramClient } from '../lib/client';
import { spec } from '../spec';

export let getPlayer = SlateTool.create(spec, {
  name: 'Get Player',
  key: 'get_player',
  description:
    'Retrieves one Pointagram player, including contact details, external ID, administrator status, and profile icon. Call list_players to discover player IDs.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      playerId: z.string().describe('Player ID returned by list_players')
    })
  )
  .output(
    z.object({
      playerId: z.string().describe('Pointagram player ID'),
      player: z.any().describe('Player details returned by Pointagram'),
      result: z.any().describe('Complete response from the Pointagram API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PointagramClient(ctx.auth);
    let result = await client.getPlayer(ctx.input.playerId);
    let player = isApiErrorRecord(result) && result.data !== undefined ? result.data : result;
    return {
      output: { playerId: ctx.input.playerId, player, result },
      message: `Retrieved player \`${ctx.input.playerId}\`.`
    };
  })
  .build();
