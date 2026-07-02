import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listUsersAndGroups = SlateTool.create(spec, {
  name: 'List Users & Groups',
  key: 'list_users_and_groups',
  description: `List groups in your organization and optionally fetch the members of a specific group. Useful for finding user IDs to assign actions, issues, or inspections.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      groupId: z
        .string()
        .optional()
        .describe('If provided, fetch the members of this group. Otherwise, list all groups.')
    })
  )
  .output(
    z.object({
      groups: z
        .array(
          z.object({
            groupId: z.string().describe('Group ID'),
            name: z.string().optional().describe('Group name')
          })
        )
        .optional()
        .describe('List of groups (when no groupId is provided)'),
      users: z
        .array(
          z.object({
            userId: z.string().describe('User ID'),
            email: z.string().optional().describe('User email'),
            firstName: z.string().optional().describe('First name'),
            lastName: z.string().optional().describe('Last name')
          })
        )
        .optional()
        .describe('List of users in the specified group')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.groupId) {
      let users = await client.listGroupUsers(ctx.input.groupId);
      let mapped = users.map((u: any) => ({
        userId: u.user_id || u.id,
        email: u.email,
        firstName: u.firstname || u.first_name,
        lastName: u.lastname || u.last_name
      }));

      return {
        output: { users: mapped },
        message: `Found **${mapped.length}** users in group ${ctx.input.groupId}.`
      };
    }

    let groups = await client.listGroups();
    let mapped = groups.map((g: any) => ({
      groupId: g.id || g.group_id,
      name: g.name
    }));

    return {
      output: { groups: mapped },
      message: `Found **${mapped.length}** groups.`
    };
  })
  .build();
