import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageGroupMembers = SlateTool.create(spec, {
  name: 'Manage Group Members',
  key: 'manage_group_members',
  description: `Add members to a VEO group or list existing group members. When adding members, you can optionally grant them group admin privileges.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      groupId: z.string().describe('ID of the group'),
      action: z
        .enum(['list', 'add'])
        .describe('Action to perform: "list" to get members, "add" to add a member'),
      userId: z
        .string()
        .optional()
        .describe('ID of the user to add (required when action is "add")'),
      admin: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to grant group admin privileges (only for "add" action)')
    })
  )
  .output(
    z.object({
      members: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of group members (when action is "list")'),
      addedUserId: z
        .string()
        .optional()
        .describe('ID of the user added (when action is "add")')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, environment: ctx.auth.environment });

    if (ctx.input.action === 'list') {
      let members = await client.getGroupMembers(ctx.input.groupId);
      let memberList = Array.isArray(members) ? members : [];

      return {
        output: { members: memberList },
        message: `Group \`${ctx.input.groupId}\` has **${memberList.length}** members.`
      };
    }

    if (!ctx.input.userId) {
      throw new Error('userId is required when action is "add"');
    }

    await client.addGroupMember(ctx.input.groupId, ctx.input.userId, ctx.input.admin);

    return {
      output: { addedUserId: ctx.input.userId },
      message: `Added user \`${ctx.input.userId}\` to group \`${ctx.input.groupId}\`${ctx.input.admin ? ' as admin' : ''}.`
    };
  })
  .build();
