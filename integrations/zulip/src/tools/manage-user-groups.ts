import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageUserGroups = SlateTool.create(spec, {
  name: 'Manage User Groups',
  key: 'manage_user_groups',
  description: `Create, update, or manage membership of user groups. Can list existing groups, create new ones, update group properties, or add/remove members.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'update', 'update_members'])
        .describe('Action to perform'),
      groupId: z
        .number()
        .optional()
        .describe('User group ID (required for update and update_members actions)'),
      name: z
        .string()
        .optional()
        .describe('Group name (required for create, optional for update)'),
      description: z
        .string()
        .optional()
        .describe('Group description (required for create, optional for update)'),
      members: z.array(z.number()).optional().describe('Member user IDs (for create action)'),
      addMembers: z
        .array(z.number())
        .optional()
        .describe('User IDs to add (for update_members action)'),
      removeMembers: z
        .array(z.number())
        .optional()
        .describe('User IDs to remove (for update_members action)')
    })
  )
  .output(
    z.object({
      groups: z
        .array(
          z.object({
            groupId: z.number().describe('User group ID'),
            name: z.string().describe('Group name'),
            description: z.string().describe('Group description'),
            members: z.array(z.number()).describe('Member user IDs')
          })
        )
        .optional()
        .describe('List of user groups (for list action)'),
      success: z.boolean().optional().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      serverUrl: ctx.auth.serverUrl,
      email: ctx.auth.email,
      token: ctx.auth.token
    });

    if (ctx.input.action === 'list') {
      let result = await client.getUserGroups();
      let groups = (result.user_groups || []).map((g: any) => ({
        groupId: g.id,
        name: g.name,
        description: g.description,
        members: g.members || []
      }));

      return {
        output: { groups },
        message: `Found ${groups.length} user group(s)`
      };
    }

    if (ctx.input.action === 'create') {
      await client.createUserGroup({
        name: ctx.input.name!,
        description: ctx.input.description || '',
        members: ctx.input.members || []
      });

      return {
        output: { success: true },
        message: `User group "${ctx.input.name}" created successfully`
      };
    }

    if (ctx.input.action === 'update') {
      await client.updateUserGroup(ctx.input.groupId!, {
        name: ctx.input.name,
        description: ctx.input.description
      });

      return {
        output: { success: true },
        message: `User group ${ctx.input.groupId} updated successfully`
      };
    }

    if (ctx.input.action === 'update_members') {
      await client.updateUserGroupMembers(ctx.input.groupId!, {
        add: ctx.input.addMembers,
        remove: ctx.input.removeMembers
      });

      return {
        output: { success: true },
        message: `User group ${ctx.input.groupId} membership updated`
      };
    }

    return {
      output: { success: false },
      message: 'Unknown action'
    };
  })
  .build();
