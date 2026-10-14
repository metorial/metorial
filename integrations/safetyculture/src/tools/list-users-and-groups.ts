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
        .describe(
          'If provided, fetch members of this group or organization. Call get_connections to discover IDs. Otherwise, list all groups.'
        ),
      limit: z.number().int().positive().optional().describe('Maximum members per page.'),
      offset: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe('Member offset for pagination.'),
      status: z
        .array(z.enum(['active', 'inactive']))
        .optional()
        .describe('Filter members by status.')
    })
  )
  .output(
    z.object({
      total: z
        .number()
        .optional()
        .describe('Total members in the selected group or organization.'),
      nextOffset: z.number().optional().describe('Offset for the next page of members.'),
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
      let result = await client.listGroupUsers(ctx.input.groupId, ctx.input);
      let mapped = result.users.map((u: any) => ({
        userId: u.user_id || u.id,
        email: u.email ?? undefined,
        firstName: u.firstname || u.first_name || undefined,
        lastName: u.lastname || u.last_name || undefined
      }));

      return {
        output: {
          users: mapped,
          total: result.total ?? undefined,
          nextOffset:
            result.total !== undefined &&
            (result.offset ?? ctx.input.offset ?? 0) + mapped.length < result.total &&
            mapped.length > 0
              ? (result.offset ?? ctx.input.offset ?? 0) + mapped.length
              : undefined
        },
        message: `Found **${mapped.length}** users in group ${ctx.input.groupId}.`
      };
    }

    let groups = await client.listGroups();
    let mapped = groups.map((g: any) => ({
      groupId: g.id || g.group_id,
      name: g.name ?? undefined
    }));

    return {
      output: { groups: mapped },
      message: `Found **${mapped.length}** groups.`
    };
  })
  .build();
