import { SlateTool } from 'slates';
import { z } from 'zod';
import { PointagramClient } from '../lib/client';
import { spec } from '../spec';

export let createPlayer = SlateTool.create(spec, {
  name: 'Create Player',
  key: 'create_player',
  description: `Creates a new player in Pointagram. Players can be created as online (receiving a login invitation) or offline (admin-managed). If a player with the same identity already exists, the API returns a conflict error.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      playerName: z.string().describe('Name of the player in Pointagram'),
      playerEmail: z
        .string()
        .optional()
        .describe('Email address of the player, used for sending login invitations'),
      playerExternalId: z
        .string()
        .optional()
        .describe('Your own unique identifier for the player'),
      offline: z
        .boolean()
        .optional()
        .describe(
          'If true, creates an offline player (managed by admin). If false, the player receives a login invitation.'
        )
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

    let result = await client.createPlayer({
      playerName: ctx.input.playerName,
      playerEmail: ctx.input.playerEmail,
      playerExternalId: ctx.input.playerExternalId,
      offline: ctx.input.offline
    });

    return {
      output: { result },
      message: `Created player **${ctx.input.playerName}**${ctx.input.offline ? ' (offline)' : ''}.`
    };
  })
  .build();
