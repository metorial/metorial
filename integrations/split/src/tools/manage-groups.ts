import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { validatePagination } from '../lib/validation';
import { spec } from '../spec';

export let manageGroups = SlateTool.create(spec, {
  name: 'Manage Groups',
  key: 'manage_groups',
  description: `Create, list, update, or delete groups in the Split organization. Groups are used to organize users and assign permissions collectively.`
})
  .input(
    z.object({
      action: z.enum(['create', 'list', 'update', 'delete']).describe('Action to perform.'),
      groupId: z.string().optional().describe('Group ID (for update, delete).'),
      groupName: z.string().optional().describe('Group name (for create, update).'),
      description: z.string().optional().describe('Group description (for create, update).'),
      offset: z.number().optional().describe('Pagination offset (for list). Defaults to 0.'),
      limit: z.number().optional().describe('Max results (for list). Defaults to 50.')
    })
  )
  .output(
    z.object({
      groups: z
        .array(
          z.object({
            groupId: z.string(),
            groupName: z.string(),
            description: z.string().optional()
          })
        )
        .optional(),
      group: z
        .object({
          groupId: z.string(),
          groupName: z.string(),
          description: z.string().optional()
        })
        .optional(),
      deleted: z.boolean().optional(),
      totalCount: z.number().optional(),
      count: z.number().optional().describe('Provider-reported count for this page.'),
      nextMarker: z.string().optional(),
      previousMarker: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    switch (ctx.input.action) {
      case 'create': {
        if (!ctx.input.groupName)
          throw createApiServiceError('groupName is required to create a group.');
        let group = await client.createGroup({
          name: ctx.input.groupName,
          description: ctx.input.description
        });
        return {
          output: {
            group: {
              groupId: group.id,
              groupName: group.name,
              description: group.description ?? undefined
            }
          },
          message: `Created group **${group.name}**.`
        };
      }

      case 'list': {
        validatePagination(ctx.input.offset, ctx.input.limit, 200);
        let result = await client.listGroups({
          offset: ctx.input.offset,
          limit: ctx.input.limit
        });
        let groups = result.objects.map(g => ({
          groupId: g.id,
          groupName: g.name,
          description: g.description ?? undefined
        }));
        return {
          output: {
            groups,
            totalCount: result.totalCount,
            count: result.count,
            nextMarker: result.nextMarker ?? undefined,
            previousMarker: result.previousMarker ?? undefined
          },
          message: `Returned **${groups.length}** groups.`
        };
      }

      case 'update': {
        if (!ctx.input.groupId) throw createApiServiceError('groupId is required.');
        if (!ctx.input.groupName)
          throw createApiServiceError('groupName is required to update a group.');
        let group = await client.updateGroup(ctx.input.groupId, {
          name: ctx.input.groupName,
          description: ctx.input.description
        });
        return {
          output: {
            group: {
              groupId: group.id,
              groupName: group.name,
              description: group.description ?? undefined
            }
          },
          message: `Updated group **${group.name}**.`
        };
      }

      case 'delete': {
        if (!ctx.input.groupId) throw createApiServiceError('groupId is required.');
        await client.deleteGroup(ctx.input.groupId);
        return {
          output: { deleted: true },
          message: `Deleted group **${ctx.input.groupId}**.`
        };
      }
    }
  })
  .build();
