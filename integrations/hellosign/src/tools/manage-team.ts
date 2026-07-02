import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTeam = SlateTool.create(spec, {
  name: 'Manage Team',
  key: 'manage_team',
  description: `View team information or manage team membership. Retrieve team details, update the team name, add members, or remove members.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['get', 'update_name', 'add_member', 'remove_member'])
        .describe('Action to perform'),
      teamName: z.string().optional().describe('New team name (for "update_name" action)'),
      memberEmailAddress: z
        .string()
        .optional()
        .describe('Email of the member (for "add_member"/"remove_member")'),
      memberAccountId: z
        .string()
        .optional()
        .describe('Account ID of the member (alternative to email)'),
      memberRole: z.string().optional().describe('Role for the new member (for "add_member")')
    })
  )
  .output(
    z.object({
      teamName: z.string().optional().describe('Team name'),
      action: z.string().describe('Action performed'),
      success: z.boolean().describe('Whether the action was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let { action } = ctx.input;
    let teamName: string | undefined;

    switch (action) {
      case 'get': {
        let team = await client.getTeam();
        teamName = team.name;
        break;
      }

      case 'update_name': {
        if (!ctx.input.teamName) {
          throw new Error('teamName is required for "update_name" action');
        }
        let team = await client.updateTeam(ctx.input.teamName);
        teamName = team.name;
        break;
      }

      case 'add_member': {
        let team = await client.addTeamMember({
          emailAddress: ctx.input.memberEmailAddress,
          accountId: ctx.input.memberAccountId,
          role: ctx.input.memberRole
        });
        teamName = team.name;
        break;
      }

      case 'remove_member': {
        let team = await client.removeTeamMember({
          emailAddress: ctx.input.memberEmailAddress,
          accountId: ctx.input.memberAccountId
        });
        teamName = team.name;
        break;
      }
    }

    let actionLabels: Record<string, string> = {
      get: 'retrieved',
      update_name: 'name updated',
      add_member: 'member added',
      remove_member: 'member removed'
    };

    return {
      output: {
        teamName,
        action,
        success: true
      },
      message: `Team${teamName ? ` **"${teamName}"**` : ''} — ${actionLabels[action]}.`
    };
  })
  .build();
