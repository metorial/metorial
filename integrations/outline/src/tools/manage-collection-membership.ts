import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, clientConfig } from '../lib/client';
import { nativeMembership, paginationSchema } from '../lib/schemas';
import { rejectFields, requireValue } from '../lib/validation';
import { spec } from '../spec';
export const manageCollectionMembership = SlateTool.create(spec, {
  name: 'Manage Collection Membership',
  key: 'manage_collection_membership',
  description:
    'Grant or remove collection access for a user or group, or list native user/group membership records for exact permission readback.'
})
  .input(
    z.object({
      collectionId: z.string().describe('Collection ID from list_collections'),
      action: z.enum([
        'add_user',
        'remove_user',
        'add_group',
        'remove_group',
        'list_users',
        'list_groups'
      ]),
      userId: z
        .string()
        .optional()
        .describe('User ID for user add/remove; discover with list_users'),
      groupId: z
        .string()
        .optional()
        .describe('Group ID for group add/remove; discover with manage_group action list'),
      permission: z
        .enum(['read', 'read_write'])
        .optional()
        .describe('Grant permission for add; optional list filter'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Page size for list actions'),
      offset: z.number().int().nonnegative().optional().describe('Offset for list actions')
    })
  )
  .output(
    z.object({
      collectionId: z.string(),
      action: z.string(),
      success: z.boolean(),
      memberships: z.array(nativeMembership).optional(),
      pagination: paginationSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    const { action, collectionId } = ctx.input;
    const list = action.startsWith('list_');
    const group = action.endsWith('group') || action === 'list_groups';
    const add = action.startsWith('add_');
    rejectFields(ctx.input, [
      'action',
      'collectionId',
      ...(list
        ? ['permission', 'limit', 'offset']
        : [group ? 'groupId' : 'userId', ...(add ? ['permission'] : [])])
    ]);
    const targetId = group ? ctx.input.groupId : ctx.input.userId;
    requireValue(
      list || targetId,
      'Provide the exact userId or groupId for this membership action.'
    );
    const client = new Client(clientConfig(ctx.auth, ctx.config));
    if (list) {
      const result = await client.collectionMemberships(collectionId, group, {
        permission: ctx.input.permission,
        limit: ctx.input.limit ?? 25,
        offset: ctx.input.offset ?? 0
      });
      return {
        output: {
          collectionId,
          action,
          success: true,
          memberships: result.memberships,
          pagination: result.pagination
        },
        message: 'Retrieved one page of collection memberships.'
      };
    }
    if (add) {
      const membership = await client.addCollectionMember(
        collectionId,
        targetId!,
        group,
        ctx.input.permission
      );
      return {
        output: { collectionId, action, success: true, memberships: [membership] },
        message: 'Outline confirmed the exact collection membership grant.'
      };
    }
    await client.removeCollectionMember(collectionId, targetId!, group);
    return {
      output: { collectionId, action, success: true },
      message:
        'Outline accepted removing this collection membership. Other access grants may remain.'
    };
  })
  .build();
