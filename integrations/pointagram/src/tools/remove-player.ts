import { SlateTool } from 'slates';
import { z } from 'zod';
import { PointagramClient } from '../lib/client';
import { spec } from '../spec';

export let removePlayer = SlateTool.create(spec, {
  name: 'Remove Player',
  key: 'remove_player',
  description: `Soft-deletes a player from Pointagram. The player is identified by name, email, or external ID. Admin users cannot be removed via the API. Full anonymization must be done within the Pointagram UI.`,
  instructions: [
    'Provide at least one identifier (name, email, or external ID) to locate the player.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      playerName: z.string().optional().describe('Name of the player to remove'),
      playerEmail: z.string().optional().describe('Email of the player to remove'),
      playerExternalId: z.string().optional().describe('External ID of the player to remove')
    })
  )
  .output(
    z.object({
      result: z.any().describe('Response from the Pointagram API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PointagramClient({
      token: ctx.auth.token,
      apiUser: ctx.auth.apiUser
    });

    let result = await client.removePlayer({
      playerName: ctx.input.playerName,
      playerEmail: ctx.input.playerEmail,
      playerExternalId: ctx.input.playerExternalId
    });

    let identifier =
      ctx.input.playerName || ctx.input.playerEmail || ctx.input.playerExternalId || 'unknown';
    return {
      output: { result },
      message: `Removed player **${identifier}** (soft-deleted).`
    };
  })
  .build();
