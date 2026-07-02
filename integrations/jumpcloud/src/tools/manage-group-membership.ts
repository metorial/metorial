import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageGroupMembership = SlateTool.create(spec, {
  name: 'Manage Group Membership',
  key: 'manage_group_membership',
  description: `Add or remove members from a JumpCloud user group or system group. Also supports listing current members. Use this to control which users belong to a user group or which systems belong to a system group.`,
  instructions: [
    'When adding a user to a user group, use groupType "user" and provide the user ID as memberId.',
    'When adding a system to a system group, use groupType "system" and provide the system ID as memberId.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['add', 'remove', 'list']).describe('Action to perform'),
      groupType: z.enum(['user', 'system']).describe('Type of group'),
      groupId: z.string().describe('Group ID'),
      memberId: z
        .string()
        .optional()
        .describe('User ID or system ID to add/remove (required for add/remove)'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Max members to return when listing (default 100)'),
      skip: z.number().min(0).optional().describe('Number of members to skip when listing')
    })
  )
  .output(
    z.object({
      groupId: z.string().describe('Group ID'),
      action: z.string().describe('Action performed'),
      members: z
        .array(
          z.object({
            memberId: z.string().describe('Member ID'),
            memberType: z.string().describe('Member type (user or system)')
          })
        )
        .optional()
        .describe('Current group members (returned for list action)'),
      success: z.boolean().describe('Whether the action succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      orgId: ctx.config.orgId
    });

    if (ctx.input.action === 'list') {
      let members: Array<{ to: { id: string; type: string } }>;
      if (ctx.input.groupType === 'user') {
        members = await client.listUserGroupMembers(ctx.input.groupId, {
          limit: ctx.input.limit,
          skip: ctx.input.skip
        });
      } else {
        members = await client.listSystemGroupMembers(ctx.input.groupId, {
          limit: ctx.input.limit,
          skip: ctx.input.skip
        });
      }

      let mapped = members.map(m => ({
        memberId: m.to.id,
        memberType: m.to.type
      }));

      return {
        output: {
          groupId: ctx.input.groupId,
          action: 'list',
          members: mapped,
          success: true
        },
        message: `Found **${mapped.length}** members in ${ctx.input.groupType} group.`
      };
    }

    if (!ctx.input.memberId) throw new Error('memberId is required for add/remove actions');

    if (ctx.input.groupType === 'user') {
      await client.manageUserGroupMembers(ctx.input.groupId, {
        op: ctx.input.action as 'add' | 'remove',
        type: 'user',
        id: ctx.input.memberId
      });
    } else {
      await client.manageSystemGroupMembers(ctx.input.groupId, {
        op: ctx.input.action as 'add' | 'remove',
        type: 'system',
        id: ctx.input.memberId
      });
    }

    let actionLabel = ctx.input.action === 'add' ? 'Added' : 'Removed';
    return {
      output: {
        groupId: ctx.input.groupId,
        action: ctx.input.action,
        success: true
      },
      message: `${actionLabel} ${ctx.input.groupType} \`${ctx.input.memberId}\` ${ctx.input.action === 'add' ? 'to' : 'from'} group \`${ctx.input.groupId}\`.`
    };
  })
  .build();
