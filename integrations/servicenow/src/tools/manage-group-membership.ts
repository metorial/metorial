import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageGroupMembership = SlateTool.create(spec, {
  name: 'Manage Group Membership',
  key: 'manage_group_membership',
  description: `Add or remove users from ServiceNow groups. List current group members, add a user to a group, or remove a user from a group.`
})
  .input(
    z.object({
      action: z
        .enum(['list', 'add', 'remove'])
        .describe('Action to perform: list group members, add a user, or remove a user'),
      groupId: z.string().describe('sys_id of the group'),
      userId: z
        .string()
        .optional()
        .describe('sys_id of the user (required for add/remove actions)'),
      membershipId: z
        .string()
        .optional()
        .describe(
          'sys_id of the group membership record (required for remove action if userId not provided)'
        )
    })
  )
  .output(
    z.object({
      members: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of group members (for list action)'),
      record: z
        .record(z.string(), z.any())
        .optional()
        .describe('The created or deleted membership record'),
      success: z.boolean().describe('Whether the action was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);

    if (ctx.input.action === 'list') {
      let members = await client.getGroupMembers(ctx.input.groupId);
      return {
        output: {
          members,
          success: true
        },
        message: `Found **${members.length}** members in the group.`
      };
    }

    if (ctx.input.action === 'add') {
      if (!ctx.input.userId) {
        throw new Error('userId is required for add action');
      }
      let record = await client.addGroupMember(ctx.input.groupId, ctx.input.userId);
      return {
        output: {
          record,
          success: true
        },
        message: `Added user to the group.`
      };
    }

    if (ctx.input.action === 'remove') {
      let membershipToRemove = ctx.input.membershipId;

      if (!membershipToRemove && ctx.input.userId) {
        let members = await client.getGroupMembers(ctx.input.groupId);
        let match = members.find(
          (m: any) => m.user?.value === ctx.input.userId || m.user === ctx.input.userId
        );
        if (!match) {
          throw new Error('User not found in the group');
        }
        membershipToRemove = match.sys_id;
      }

      if (!membershipToRemove) {
        throw new Error('Either membershipId or userId is required for remove action');
      }

      await client.removeGroupMember(membershipToRemove);
      return {
        output: {
          success: true
        },
        message: `Removed user from the group.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
