import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createRocketadminClient } from '../lib/client';
import { spec } from '../spec';

export let manageCompanyUsers = SlateTool.create(spec, {
  name: 'Manage Company Users',
  key: 'manage_company_users',
  description: `Manage users within a Rocketadmin company (organization). Invite new users, list existing members, remove users, or suspend/unsuspend accounts.`,
  instructions: [
    'Hosted invitations require a current turnstileToken issued by Rocketadmin after completing its interactive invitation challenge. Self-hosted deployments may omit the token.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'invite', 'remove', 'suspend', 'unsuspend'])
        .describe('Action to perform'),
      companyId: z
        .string()
        .describe('Company ID. Call get_my_company to discover the current company.'),
      userId: z
        .string()
        .optional()
        .describe('User ID (required for remove, suspend, unsuspend)'),
      email: z.string().optional().describe('Email address (required for invite)'),
      groupId: z
        .string()
        .optional()
        .describe(
          'Optional connection group to assign the invited user to; call manage_groups to discover IDs'
        ),
      role: z
        .enum(['ADMIN', 'USER', 'DB_ADMIN'])
        .optional()
        .describe('Company role; required when inviting a user'),
      turnstileToken: z
        .string()
        .optional()
        .describe(
          'Current token from the interactive Rocketadmin invitation challenge. Required for hosted invitations; self-hosted deployments may omit it.'
        )
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
    let client = createRocketadminClient(ctx.auth, ctx.config);

    let { action, companyId, userId, email, groupId, role, turnstileToken } = ctx.input;

    if (action === 'list') {
      let users = await client.getUsersInCompany(companyId);
      return {
        output: { users, success: true },
        message: `Found **${users.length}** user(s) in company **${companyId}**.`
      };
    }

    if (action === 'invite') {
      if (!email) throw createApiServiceError('email is required for inviting a user');
      if (!role) throw createApiServiceError('role is required for inviting a user.');
      await client.inviteUserToCompany(companyId, email, groupId, role, turnstileToken);
      return {
        output: { success: true },
        message: `Invited **${email}** to company **${companyId}**.`
      };
    }

    if (action === 'remove') {
      if (!userId) throw createApiServiceError('userId is required for removing a user');
      await client.removeUserFromCompany(companyId, userId);
      return {
        output: { success: true },
        message: `Removed user **${userId}** from company **${companyId}**.`
      };
    }

    if (action === 'suspend') {
      if (!userId) throw createApiServiceError('userId is required for suspending a user');
      await client.suspendUser(companyId, userId);
      return {
        output: { success: true },
        message: `Suspended user **${userId}** in company **${companyId}**.`
      };
    }

    if (action === 'unsuspend') {
      if (!userId) throw createApiServiceError('userId is required for unsuspending a user');
      await client.suspendUser(companyId, userId, false);
      return {
        output: { success: true },
        message: `Unsuspended user **${userId}** in company **${companyId}**.`
      };
    }

    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
