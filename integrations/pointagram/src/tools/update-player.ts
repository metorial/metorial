import { SlateTool } from 'slates';
import { z } from 'zod';
import { PointagramClient } from '../lib/client';
import { spec } from '../spec';

export let updatePlayer = SlateTool.create(spec, {
  name: 'Update Player',
  key: 'update_player',
  description:
    'Updates an existing Pointagram player by ID, including their name, email, external ID, and online/offline setting. Call list_players to discover player IDs. Provide at least one field to update.',
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      playerId: z.string().describe('Player ID returned by list_players'),
      playerName: z.string().optional().describe('Updated player name'),
      playerEmail: z.string().optional().describe('Updated player email address'),
      playerExternalId: z.string().optional().describe('Updated external player identifier'),
      offline: z
        .boolean()
        .optional()
        .describe('True for an admin-managed offline player; false for an online player')
    })
  )
  .output(
    z.object({
      playerId: z.string().describe('Pointagram player ID'),
      result: z.any().describe('Response from the Pointagram API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PointagramClient(ctx.auth);
    let result = await client.updatePlayer(ctx.input.playerId, ctx.input);
    return {
      output: { playerId: ctx.input.playerId, result },
      message: `Updated player \`${ctx.input.playerId}\`.`
    };
  })
  .build();
