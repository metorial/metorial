import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let groupSchema = z.object({
  groupId: z.number().describe('Group identifier'),
  name: z.string().describe('Group name'),
  sortOrder: z.number().describe('Display order'),
  createdAt: z.string().nullable().describe('Creation timestamp (UTC)'),
  updatedAt: z.string().nullable().describe('Last update timestamp (UTC)')
});

let groupItemSchema = z.object({
  groupItemId: z.number().describe('Group item identifier'),
  groupId: z.number().describe('Parent group identifier'),
  name: z.string().describe('Group item name'),
  sortOrder: z.number().describe('Display order'),
  createdAt: z.string().nullable().describe('Creation timestamp (UTC)'),
  updatedAt: z.string().nullable().describe('Last update timestamp (UTC)')
});

export let listGroups = SlateTool.create(spec, {
  name: 'List Groups',
  key: 'list_groups',
  description: `Retrieve all groups. Groups organize users and data into departments, teams, or other organizational units. Optionally include the items within each group.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeItems: z
        .boolean()
        .optional()
        .default(false)
        .describe('If true, also fetches the items within each group')
    })
  )
  .output(
    z.object({
      groups: z
        .array(
          groupSchema.extend({
            items: z.array(groupItemSchema).optional().describe('Items within this group')
          })
        )
        .describe('List of all groups')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let groups = await client.listGroups();

    let mapped = await Promise.all(
      groups.map(async (g: any) => {
        let group: any = {
          groupId: g.id,
          name: g.name,
          sortOrder: g.sort_order,
          createdAt: g.created_at ?? null,
          updatedAt: g.updated_at ?? null
        };

        if (ctx.input.includeItems) {
          let items = await client.listGroupItems(g.id);
          group.items = (Array.isArray(items) ? items : []).map((i: any) => ({
            groupItemId: i.id,
            groupId: i.group_id,
            name: i.name,
            sortOrder: i.sort_order,
            createdAt: i.created_at ?? null,
            updatedAt: i.updated_at ?? null
          }));
        }

        return group;
      })
    );

    return {
      output: { groups: mapped },
      message: `Retrieved **${mapped.length}** groups.`
    };
  })
  .build();

export let createGroup = SlateTool.create(spec, {
  name: 'Create Group',
  key: 'create_group',
  description: `Create a new group for organizing users and KPI data (e.g., departments, teams, regions).`
})
  .input(
    z.object({
      name: z.string().describe('Group name (max 50 characters)'),
      sortOrder: z.number().describe('Display order')
    })
  )
  .output(
    z.object({
      groupId: z.number().describe('ID of the newly created group'),
      name: z.string().describe('Name of the created group')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let result = await client.createGroup({
      name: ctx.input.name,
      sort_order: ctx.input.sortOrder
    });

    return {
      output: { groupId: result.id, name: result.name },
      message: `Created group **${result.name}** (ID: ${result.id}).`
    };
  })
  .build();

export let updateGroup = SlateTool.create(spec, {
  name: 'Update Group',
  key: 'update_group',
  description: `Update an existing group's name or sort order.`
})
  .input(
    z.object({
      groupId: z.number().describe('ID of the group to update'),
      name: z.string().optional().describe('New group name'),
      sortOrder: z.number().optional().describe('New display order')
    })
  )
  .output(
    z.object({
      groupId: z.number().describe('ID of the updated group'),
      name: z.string().describe('Name of the updated group')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let data: Record<string, unknown> = {};
    if (ctx.input.name !== undefined) data.name = ctx.input.name;
    if (ctx.input.sortOrder !== undefined) data.sort_order = ctx.input.sortOrder;

    let result = await client.updateGroup(ctx.input.groupId, data);

    return {
      output: { groupId: result.id, name: result.name },
      message: `Updated group **${result.name}** (ID: ${result.id}).`
    };
  })
  .build();

export let deleteGroup = SlateTool.create(spec, {
  name: 'Delete Group',
  key: 'delete_group',
  description: `Permanently delete a group and its items from SimpleKPI.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      groupId: z.number().describe('ID of the group to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    await client.deleteGroup(ctx.input.groupId);

    return {
      output: { success: true },
      message: `Deleted group with ID **${ctx.input.groupId}**.`
    };
  })
  .build();
