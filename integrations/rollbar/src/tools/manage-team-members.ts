import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTeamMembers = SlateTool.create(spec, {
  name: 'Manage Team Members',
  key: 'manage_team_members',
  description: `List, add, remove, or invite members of a Rollbar team. Supports adding existing users by ID, removing users, and sending email invitations to new users.
Requires an **account-level** access token.`,
  instructions: [
    'Use action "list" to see all members of a team.',
    'Use action "add" with userId to add an existing user.',
    'Use action "remove" with userId to remove a user.',
    'Use action "invite" with email to send an invitation.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'add', 'remove', 'invite']).describe('Operation to perform'),
      teamId: z.number().describe('Team ID'),
      userId: z
        .number()
        .optional()
        .describe('User ID (required for "add" and "remove" actions)'),
      email: z
        .string()
        .optional()
        .describe('Email address to invite (required for "invite" action)')
    })
  )
  .output(
    z.object({
      members: z
        .array(
          z.object({
            userId: z.number().describe('User ID'),
            username: z.string().optional().describe('Username'),
            email: z.string().optional().describe('Email address')
          })
        )
        .optional()
        .describe('List of team members'),
      success: z.boolean().optional().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let result = await client.listTeamMembers(ctx.input.teamId);
      let users = (result?.result || []).map((u: any) => ({
        userId: u.id,
        username: u.username,
        email: u.email
      }));
      return {
        output: { members: users },
        message: `Team ${ctx.input.teamId} has **${users.length}** members.`
      };
    }

    if (ctx.input.action === 'add') {
      if (!ctx.input.userId) throw new Error('userId is required for "add" action');
      await client.addUserToTeam(ctx.input.teamId, ctx.input.userId);
      return {
        output: { success: true },
        message: `Added user **${ctx.input.userId}** to team **${ctx.input.teamId}**.`
      };
    }

    if (ctx.input.action === 'remove') {
      if (!ctx.input.userId) throw new Error('userId is required for "remove" action');
      await client.removeUserFromTeam(ctx.input.teamId, ctx.input.userId);
      return {
        output: { success: true },
        message: `Removed user **${ctx.input.userId}** from team **${ctx.input.teamId}**.`
      };
    }

    if (ctx.input.action === 'invite') {
      if (!ctx.input.email) throw new Error('email is required for "invite" action');
      await client.inviteUserToTeam(ctx.input.teamId, ctx.input.email);
      return {
        output: { success: true },
        message: `Invited **${ctx.input.email}** to team **${ctx.input.teamId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
