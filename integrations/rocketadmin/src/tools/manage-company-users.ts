import { SlateTool } from 'slates';
import { z } from 'zod';
import { RocketadminClient } from '../lib/client';
import { spec } from '../spec';

export let manageCompanyUsers = SlateTool.create(spec, {
  name: 'Manage Company Users',
  key: 'manage_company_users',
  description: `Manage users within a Rocketadmin company (organization). Invite new users, list existing members, remove users, or suspend/unsuspend accounts.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'invite', 'remove', 'suspend', 'unsuspend'])
        .describe('Action to perform'),
      companyId: z.string().describe('Company (organization) ID'),
      userId: z
        .string()
        .optional()
        .describe('User ID (required for remove, suspend, unsuspend)'),
      email: z.string().optional().describe('Email address (required for invite)'),
      groupId: z
        .string()
        .optional()
        .describe('Group ID to assign the invited user to (required for invite)')
    })
  )
  .output(
    z.object({
      users: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of company users'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RocketadminClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let { action, companyId, userId, email, groupId } = ctx.input;

    if (action === 'list') {
      let users = await client.getUsersInCompany(companyId);
      return {
        output: { users, success: true },
        message: `Found **${users.length}** user(s) in company **${companyId}**.`
      };
    }

    if (action === 'invite') {
      if (!email) throw new Error('email is required for inviting a user');
      if (!groupId) throw new Error('groupId is required for inviting a user');
      await client.inviteUserToCompany(companyId, email, groupId);
      return {
        output: { success: true },
        message: `Invited **${email}** to company **${companyId}**.`
      };
    }

    if (action === 'remove') {
      if (!userId) throw new Error('userId is required for removing a user');
      await client.removeUserFromCompany(companyId, userId);
      return {
        output: { success: true },
        message: `Removed user **${userId}** from company **${companyId}**.`
      };
    }

    if (action === 'suspend') {
      if (!userId) throw new Error('userId is required for suspending a user');
      await client.suspendUser(companyId, userId);
      return {
        output: { success: true },
        message: `Suspended user **${userId}** in company **${companyId}**.`
      };
    }

    if (action === 'unsuspend') {
      if (!userId) throw new Error('userId is required for unsuspending a user');
      await client.unsuspendUser(companyId, userId);
      return {
        output: { success: true },
        message: `Unsuspended user **${userId}** in company **${companyId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
