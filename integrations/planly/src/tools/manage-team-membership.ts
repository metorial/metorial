import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTeamMembership = SlateTool.create(spec, {
  name: 'Manage Team Membership',
  key: 'manage_team_membership',
  description: `Transfer team ownership to another user or remove a user from a team. Use **transferOwnership** to designate a new team owner, or **removeUser** to revoke a member's access.`,
  instructions: [
    'Use "List Team Members" first to find available user IDs.',
    'Transferring ownership makes the specified user the new owner of the team.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['transferOwnership', 'removeUser'])
        .describe('The membership operation to perform'),
      teamId: z.string().describe('ID of the team'),
      userId: z.string().describe('ID of the user to transfer ownership to or remove')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful'),
      message: z.string().describe('Result message from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'transferOwnership') {
      let result = await client.transferTeamOwnership(ctx.input.teamId, ctx.input.userId);
      return {
        output: {
          success: true,
          message: result.data || 'Ownership transferred successfully'
        },
        message: `Team ownership transferred to user ${ctx.input.userId}.`
      };
    }

    let result = await client.removeTeamUser(ctx.input.teamId, ctx.input.userId);
    return {
      output: {
        success: true,
        message: result.data || 'User removed from team'
      },
      message: `User ${ctx.input.userId} removed from team ${ctx.input.teamId}.`
    };
  });
