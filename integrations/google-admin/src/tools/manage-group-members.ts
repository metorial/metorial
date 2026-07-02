import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleAdminActionScopes } from '../scopes';
import { spec } from '../spec';

export let manageGroupMembers = SlateTool.create(spec, {
  name: 'Manage Group Members',
  key: 'manage_group_members',
  description: `List, add, update, or remove members from a Google Workspace group. Supports managing member roles (OWNER, MANAGER, MEMBER) and filtering by role.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .scopes(googleAdminActionScopes.manageGroupMembers)
  .input(
    z.object({
      groupKey: z.string().describe('Group email address or unique group ID'),
      action: z
        .enum(['list', 'add', 'update', 'remove'])
        .describe('Action to perform on group membership'),
      memberEmail: z
        .string()
        .optional()
        .describe('Email address of the member (required for add, update, remove)'),
      role: z
        .enum(['OWNER', 'MANAGER', 'MEMBER'])
        .optional()
        .describe('Role for the member. Used with add/update actions.'),
      filterRole: z
        .enum(['OWNER', 'MANAGER', 'MEMBER'])
        .optional()
        .describe('Filter members by role (only for list action)'),
      maxResults: z
        .number()
        .optional()
        .describe('Max results for list (1-200). Defaults to 200.'),
      pageToken: z.string().optional().describe('Page token for list action')
    })
  )
  .output(
    z.object({
      members: z
        .array(
          z.object({
            memberId: z.string().optional(),
            email: z.string().optional(),
            role: z.string().optional(),
            type: z.string().optional(),
            status: z.string().optional()
          })
        )
        .optional(),
      nextPageToken: z.string().optional(),
      addedMember: z.string().optional(),
      updatedMember: z.string().optional(),
      removedMember: z.string().optional(),
      action: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      customerId: ctx.config.customerId,
      domain: ctx.config.domain
    });

    if (ctx.input.action === 'list') {
      let result = await client.listGroupMembers(ctx.input.groupKey, {
        roles: ctx.input.filterRole,
        maxResults: ctx.input.maxResults,
        pageToken: ctx.input.pageToken
      });

      let members = (result.members || []).map((m: any) => ({
        memberId: m.id,
        email: m.email,
        role: m.role,
        type: m.type,
        status: m.status
      }));

      return {
        output: { members, nextPageToken: result.nextPageToken, action: 'list' },
        message: `Found **${members.length}** members in group **${ctx.input.groupKey}**.`
      };
    }

    if (!ctx.input.memberEmail) {
      throw new Error('Member email is required for add/update/remove actions');
    }

    if (ctx.input.action === 'add') {
      let member = await client.addGroupMember(ctx.input.groupKey, {
        email: ctx.input.memberEmail,
        role: ctx.input.role || 'MEMBER'
      });
      return {
        output: { addedMember: member.email, action: 'add' },
        message: `Added **${ctx.input.memberEmail}** as ${ctx.input.role || 'MEMBER'} to group **${ctx.input.groupKey}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.role) throw new Error('Role is required for update action');
      let member = await client.updateGroupMember(ctx.input.groupKey, ctx.input.memberEmail, {
        role: ctx.input.role
      });
      return {
        output: { updatedMember: member.email, action: 'update' },
        message: `Updated **${ctx.input.memberEmail}** role to ${ctx.input.role} in group **${ctx.input.groupKey}**.`
      };
    }

    // remove
    await client.removeGroupMember(ctx.input.groupKey, ctx.input.memberEmail);
    return {
      output: { removedMember: ctx.input.memberEmail, action: 'remove' },
      message: `Removed **${ctx.input.memberEmail}** from group **${ctx.input.groupKey}**.`
    };
  })
  .build();
