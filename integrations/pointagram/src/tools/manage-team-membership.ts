import { SlateTool } from 'slates';
import { z } from 'zod';
import { PointagramClient } from '../lib/client';
import { spec } from '../spec';

export let manageTeamMembership = SlateTool.create(spec, {
  name: 'Manage Team Membership',
  key: 'manage_team_membership',
  description: `Add or remove a player from a team. Identify the player by their Pointagram player ID, name, email, or external ID.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['add', 'remove'])
        .describe('Whether to add or remove the player from the team'),
      teamId: z.string().describe('ID of the team'),
      playerId: z.string().optional().describe('Pointagram player ID'),
      playerName: z.string().optional().describe('Name of the player'),
      playerEmail: z.string().optional().describe('Email of the player'),
      playerExternalId: z.string().optional().describe('External ID of the player')
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

    let playerParams = {
      teamId: ctx.input.teamId,
      playerId: ctx.input.playerId,
      playerName: ctx.input.playerName,
      playerEmail: ctx.input.playerEmail,
      playerExternalId: ctx.input.playerExternalId
    };

    let result: any;
    if (ctx.input.action === 'add') {
      result = await client.addPlayerToTeam(playerParams);
    } else {
      result = await client.removePlayerFromTeam(playerParams);
    }

    let identifier =
      ctx.input.playerName ||
      ctx.input.playerEmail ||
      ctx.input.playerExternalId ||
      ctx.input.playerId ||
      'unknown';
    let verb = ctx.input.action === 'add' ? 'Added' : 'Removed';
    let preposition = ctx.input.action === 'add' ? 'to' : 'from';

    return {
      output: { result },
      message: `${verb} player **${identifier}** ${preposition} team \`${ctx.input.teamId}\`.`
    };
  })
  .build();
