import { SlateTool } from 'slates';
import { z } from 'zod';
import { OktaClient } from '../lib/client';
import { oktaServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageGroupMembershipTool = SlateTool.create(spec, {
  name: 'Manage Group Membership',
  key: 'manage_group_membership',
  description: `Add or remove users from an Okta group, or list current group members. Use this to manage who belongs to a group.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['add', 'remove', 'list']).describe('Operation to perform'),
      groupId: z.string().describe('Okta group ID'),
      userId: z
        .string()
        .optional()
        .describe('User ID to add or remove (required for add/remove)'),
      limit: z.number().optional().describe('Max members to return when listing'),
      after: z.string().optional().describe('Pagination cursor for listing members')
    })
  )
  .output(
    z.object({
      groupId: z.string(),
      action: z.string(),
      success: z.boolean(),
      members: z
        .array(
          z.object({
            userId: z.string(),
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            email: z.string().optional(),
            status: z.string()
          })
        )
        .optional()
        .describe('Group members (only for list action)'),
      nextCursor: z.string().optional(),
      hasMore: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new OktaClient({
      domain: ctx.config.domain,
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let { action, groupId, userId } = ctx.input;

    if (action === 'add') {
      if (!userId) throw oktaServiceError('User ID is required for add action');
      await client.addUserToGroup(groupId, userId);
      return {
        output: { groupId, action, success: true },
        message: `Added user \`${userId}\` to group \`${groupId}\`.`
      };
    }

    if (action === 'remove') {
      if (!userId) throw oktaServiceError('User ID is required for remove action');
      await client.removeUserFromGroup(groupId, userId);
      return {
        output: { groupId, action, success: true },
        message: `Removed user \`${userId}\` from group \`${groupId}\`.`
      };
    }

    if (action === 'list') {
      let result = await client.listGroupMembers(groupId, {
        limit: ctx.input.limit,
        after: ctx.input.after
      });

      let members = result.items.map(u => ({
        userId: u.id,
        firstName: u.profile.firstName,
        lastName: u.profile.lastName,
        email: u.profile.email,
        status: u.status
      }));

      let nextCursor: string | undefined;
      if (result.nextUrl) {
        let url = new URL(result.nextUrl);
        nextCursor = url.searchParams.get('after') || undefined;
      }

      return {
        output: {
          groupId,
          action,
          success: true,
          members,
          nextCursor,
          hasMore: !!result.nextUrl
        },
        message: `Found **${members.length}** member(s) in group \`${groupId}\`${result.nextUrl ? ' (more available)' : ''}.`
      };
    }

    throw oktaServiceError(`Unknown action: ${action}`);
  })
  .build();
