import { SlateTool } from 'slates';
import { z } from 'zod';
import { AnthropicClient } from '../lib/client';
import { anthropicServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageOrganizationMembers = SlateTool.create(spec, {
  name: 'Manage Organization Members',
  key: 'manage_organization_members',
  description: `Manage organization members and invites via the Admin API. List members, update roles, remove members, or manage invitations.
Use **action** to specify the operation. Requires an Admin API key (sk-ant-admin...).`,
  instructions: [
    'For "list_members": optionally pass limit and afterId for pagination.',
    'For "update_member": provide userId and role.',
    'For "remove_member": provide userId.',
    'For "invite": provide email and role.',
    'For "list_invites": optionally pass limit and afterId for pagination.',
    'For "get_invite": provide inviteId.',
    'For "delete_invite": provide inviteId.'
  ],
  constraints: [
    'Requires an Admin API key (sk-ant-admin...).',
    'Only organization admins can use this tool.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'list_members',
          'update_member',
          'remove_member',
          'invite',
          'list_invites',
          'get_invite',
          'delete_invite'
        ])
        .describe('Operation to perform'),
      userId: z.string().optional().describe('User ID (for update_member, remove_member)'),
      inviteId: z.string().optional().describe('Invite ID (for delete_invite)'),
      email: z.string().optional().describe('Email address (for invite)'),
      role: z.string().optional().describe('Organization role (for update_member, invite)'),
      limit: z.number().optional().describe('Max results (for list operations)'),
      afterId: z.string().optional().describe('Pagination cursor (for list operations)')
    })
  )
  .output(
    z.object({
      members: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of organization members'),
      invites: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of invitations'),
      invite: z.record(z.string(), z.unknown()).optional().describe('Invitation details'),
      member: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Updated or invited member details'),
      hasMore: z.boolean().optional().describe('Whether more results are available'),
      success: z.boolean().optional().describe('Whether a delete/remove operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AnthropicClient({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    switch (ctx.input.action) {
      case 'list_members': {
        let result = await client.listMembers({
          limit: ctx.input.limit,
          afterId: ctx.input.afterId
        });
        return {
          output: { members: result.members, hasMore: result.hasMore },
          message: `Found **${result.members.length}** organization member(s).`
        };
      }
      case 'update_member': {
        if (!ctx.input.userId || !ctx.input.role) {
          throw anthropicServiceError('userId and role are required for "update_member"');
        }
        let member = await client.updateMember(ctx.input.userId, ctx.input.role);
        return {
          output: { member },
          message: `Updated member **${ctx.input.userId}** to role **${ctx.input.role}**.`
        };
      }
      case 'remove_member': {
        if (!ctx.input.userId) {
          throw anthropicServiceError('userId is required for "remove_member"');
        }
        await client.removeMember(ctx.input.userId);
        return {
          output: { success: true },
          message: `Removed member **${ctx.input.userId}** from the organization.`
        };
      }
      case 'invite': {
        if (!ctx.input.email || !ctx.input.role) {
          throw anthropicServiceError('email and role are required for "invite"');
        }
        let member = await client.createInvite(ctx.input.email, ctx.input.role);
        return {
          output: { member },
          message: `Invited **${ctx.input.email}** with role **${ctx.input.role}**.`
        };
      }
      case 'list_invites': {
        let result = await client.listInvites({
          limit: ctx.input.limit,
          afterId: ctx.input.afterId
        });
        return {
          output: { invites: result.invites, hasMore: result.hasMore },
          message: `Found **${result.invites.length}** invitation(s).`
        };
      }
      case 'get_invite': {
        if (!ctx.input.inviteId) {
          throw anthropicServiceError('inviteId is required for "get_invite"');
        }
        let invite = await client.getInvite(ctx.input.inviteId);
        return {
          output: { invite },
          message: `Retrieved invite **${ctx.input.inviteId}**.`
        };
      }
      case 'delete_invite': {
        if (!ctx.input.inviteId) {
          throw anthropicServiceError('inviteId is required for "delete_invite"');
        }
        await client.deleteInvite(ctx.input.inviteId);
        return {
          output: { success: true },
          message: `Deleted invite **${ctx.input.inviteId}**.`
        };
      }
    }
  })
  .build();
