import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, clientConfig } from '../lib/client';
import { groupOutput, mapGroup, nativeMembership, paginationSchema } from '../lib/schemas';
import { rejectFields, requireValue } from '../lib/validation';
import { spec } from '../spec';
export const manageGroup = SlateTool.create(spec, {
  name: 'Manage Group',
  key: 'manage_group',
  description:
    'Create, read, list, update or delete groups, and add/remove users or list exact memberships. Externally managed groups may reject mutations.'
})
  .input(
    z.object({
      action: z.enum([
        'create',
        'update',
        'delete',
        'add_user',
        'remove_user',
        'get',
        'list',
        'list_members'
      ]),
      groupId: z
        .string()
        .optional()
        .describe('Group ID required except for create/list; discover with action list'),
      name: z.string().optional().describe('Group name for create/update'),
      userId: z.string().optional().describe('User ID for membership add/remove'),
      query: z.string().optional().describe('Name filter for list/list_members'),
      limit: z.number().int().min(1).max(100).optional(),
      offset: z.number().int().nonnegative().optional()
    })
  )
  .output(
    z.object({
      groupId: z.string().optional(),
      name: z.string().optional(),
      action: z.string(),
      success: z.boolean(),
      group: groupOutput.optional(),
      groups: z.array(groupOutput).optional(),
      memberships: z.array(nativeMembership).optional(),
      pagination: paginationSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    const { action, groupId } = ctx.input;
    const list = action === 'list' || action === 'list_members';
    rejectFields(ctx.input, [
      'action',
      ...(action === 'create'
        ? ['name']
        : action === 'list'
          ? ['query', 'limit', 'offset']
          : [
              'groupId',
              ...(action === 'update'
                ? ['name']
                : list
                  ? ['query', 'limit', 'offset']
                  : action === 'add_user' || action === 'remove_user'
                    ? ['userId']
                    : [])
            ])
    ]);
    requireValue(
      action === 'create' || action === 'list' || groupId,
      'Provide groupId from manage_group action list.'
    );
    requireValue(
      (action !== 'create' && action !== 'update') ||
        (ctx.input.name?.trim() && ctx.input.name.length <= 255),
      'Provide a nonempty group name up to 255 characters.'
    );
    requireValue(
      (action !== 'add_user' && action !== 'remove_user') || ctx.input.userId,
      'Provide userId from list_users.'
    );
    const client = new Client(clientConfig(ctx.auth, ctx.config));
    if (list) {
      const input = {
        query: ctx.input.query,
        limit: ctx.input.limit ?? 25,
        offset: ctx.input.offset ?? 0
      };
      if (action === 'list') {
        const result = await client.listGroups(input);
        return {
          output: {
            action,
            success: true,
            groups: result.data.map(mapGroup),
            pagination: result.pagination
          },
          message: 'Retrieved one page of groups.'
        };
      }
      const result = await client.groupMemberships(groupId!, input);
      return {
        output: {
          groupId,
          action,
          success: true,
          memberships: result.memberships,
          pagination: result.pagination
        },
        message: 'Retrieved one page of group memberships.'
      };
    }
    if (action === 'delete') {
      await client.deleteGroup(groupId!);
      return {
        output: { groupId, action, success: true },
        message:
          'Outline accepted group deletion. Access and event history follow instance retention rules.'
      };
    }
    const group =
      action === 'create'
        ? await client.createGroup({ name: ctx.input.name })
        : action === 'update'
          ? await client.updateGroup({ id: groupId!, name: ctx.input.name })
          : action === 'get'
            ? await client.getGroup(groupId!)
            : await client.changeGroupMember(
                groupId!,
                ctx.input.userId!,
                action === 'add_user'
              );
    requireValue(
      ctx.input.name === undefined || group.name === ctx.input.name,
      'Outline group receipt differs from the requested name. Inspect the exact group before retrying.'
    );
    return {
      output: {
        groupId: group.id,
        name: group.name,
        action,
        success: true,
        group: mapGroup(group)
      },
      message: `Outline confirmed group ${action}.`
    };
  })
  .build();
