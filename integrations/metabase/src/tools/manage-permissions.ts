import { SlateTool } from 'slates';
import { z } from 'zod';
import { MetabaseClient } from '../lib/client';
import { spec } from '../spec';

export let managePermissions = SlateTool.create(spec, {
  name: 'Manage Permissions',
  key: 'manage_permissions',
  description: `Manage permission groups and group memberships in Metabase.
Create or delete permission groups, add or remove users from groups, and list all groups.
Permission groups control access to databases, tables, and collections.`,
  constraints: ['Requires superuser (admin) privileges.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'list_groups',
          'get_group',
          'create_group',
          'delete_group',
          'add_member',
          'remove_member'
        ])
        .describe('The action to perform'),
      groupId: z
        .number()
        .optional()
        .describe('Permission group ID (required for get_group, delete_group, add_member)'),
      groupName: z
        .string()
        .optional()
        .describe('Name for the new group (required for create_group)'),
      userId: z
        .number()
        .optional()
        .describe('User ID to add to a group (required for add_member)'),
      membershipId: z
        .number()
        .optional()
        .describe('Membership ID to remove (required for remove_member)')
    })
  )
  .output(
    z.object({
      groups: z
        .array(
          z.object({
            groupId: z.number().describe('ID of the permission group'),
            name: z.string().describe('Name of the group'),
            memberCount: z.number().optional().describe('Number of members in the group')
          })
        )
        .optional()
        .describe('List of permission groups'),
      groupId: z.number().optional().describe('ID of the group'),
      groupName: z.string().optional().describe('Name of the group'),
      membershipId: z.number().optional().describe('ID of the membership'),
      members: z
        .array(
          z.object({
            userId: z.number().describe('User ID'),
            email: z.string().optional().describe('User email'),
            firstName: z.string().nullable().optional().describe('First name'),
            lastName: z.string().nullable().optional().describe('Last name')
          })
        )
        .optional()
        .describe('Members of the group'),
      success: z.boolean().optional().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MetabaseClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });

    if (ctx.input.action === 'list_groups') {
      let groups = await client.listPermissionGroups();
      let items = (Array.isArray(groups) ? groups : []).map((g: any) => ({
        groupId: g.id,
        name: g.name,
        memberCount: g.member_count
      }));

      return {
        output: { groups: items },
        message: `Found **${items.length}** permission group(s)`
      };
    }

    if (ctx.input.action === 'get_group') {
      let group = await client.getPermissionGroup(ctx.input.groupId!);
      let members = (group.members || []).map((m: any) => ({
        userId: m.user_id,
        email: m.email,
        firstName: m.first_name ?? null,
        lastName: m.last_name ?? null
      }));

      return {
        output: {
          groupId: group.id,
          groupName: group.name,
          members
        },
        message: `Group **${group.name}** (ID: ${group.id}) has ${members.length} member(s)`
      };
    }

    if (ctx.input.action === 'create_group') {
      let group = await client.createPermissionGroup(ctx.input.groupName!);
      return {
        output: {
          groupId: group.id,
          groupName: group.name,
          success: true
        },
        message: `Created permission group **${group.name}** (ID: ${group.id})`
      };
    }

    if (ctx.input.action === 'delete_group') {
      await client.deletePermissionGroup(ctx.input.groupId!);
      return {
        output: { groupId: ctx.input.groupId, success: true },
        message: `Deleted permission group ${ctx.input.groupId}`
      };
    }

    if (ctx.input.action === 'add_member') {
      let result = await client.addUserToGroup(ctx.input.userId!, ctx.input.groupId!);
      return {
        output: {
          groupId: ctx.input.groupId,
          membershipId: result.membership_id ?? result.id,
          success: true
        },
        message: `Added user ${ctx.input.userId} to group ${ctx.input.groupId}`
      };
    }

    // remove_member
    await client.removeUserFromGroup(ctx.input.membershipId!);
    return {
      output: { membershipId: ctx.input.membershipId, success: true },
      message: `Removed membership ${ctx.input.membershipId}`
    };
  })
  .build();
