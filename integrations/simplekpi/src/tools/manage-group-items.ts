import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createGroupItem = SlateTool.create(spec, {
  name: 'Create Group Item',
  key: 'create_group_item',
  description: `Create a new item within a group. Group items represent sub-categories within a group (e.g., specific teams within a department).`
})
  .input(
    z.object({
      groupId: z.number().describe('ID of the parent group'),
      name: z.string().describe('Group item name (max 100 characters)'),
      sortOrder: z.number().describe('Display order within the group')
    })
  )
  .output(
    z.object({
      groupItemId: z.number().describe('ID of the newly created group item'),
      groupId: z.number().describe('Parent group ID'),
      name: z.string().describe('Name of the created item')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let result = await client.createGroupItem(ctx.input.groupId, {
      name: ctx.input.name,
      sort_order: ctx.input.sortOrder
    });

    return {
      output: {
        groupItemId: result.id,
        groupId: result.group_id,
        name: result.name
      },
      message: `Created group item **${result.name}** (ID: ${result.id}) in group ${ctx.input.groupId}.`
    };
  })
  .build();

export let updateGroupItem = SlateTool.create(spec, {
  name: 'Update Group Item',
  key: 'update_group_item',
  description: `Update an existing group item's name or sort order.`
})
  .input(
    z.object({
      groupId: z.number().describe('ID of the parent group'),
      groupItemId: z.number().describe('ID of the group item to update'),
      name: z.string().optional().describe('New item name'),
      sortOrder: z.number().optional().describe('New display order')
    })
  )
  .output(
    z.object({
      groupItemId: z.number().describe('ID of the updated group item'),
      name: z.string().describe('Name of the updated item')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let data: Record<string, unknown> = {};
    if (ctx.input.name !== undefined) data.name = ctx.input.name;
    if (ctx.input.sortOrder !== undefined) data.sort_order = ctx.input.sortOrder;

    let result = await client.updateGroupItem(ctx.input.groupId, ctx.input.groupItemId, data);

    return {
      output: {
        groupItemId: result.id,
        name: result.name
      },
      message: `Updated group item **${result.name}** (ID: ${result.id}).`
    };
  })
  .build();

export let deleteGroupItem = SlateTool.create(spec, {
  name: 'Delete Group Item',
  key: 'delete_group_item',
  description: `Permanently delete a group item from a group.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      groupId: z.number().describe('ID of the parent group'),
      groupItemId: z.number().describe('ID of the group item to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    await client.deleteGroupItem(ctx.input.groupId, ctx.input.groupItemId);

    return {
      output: { success: true },
      message: `Deleted group item **${ctx.input.groupItemId}** from group **${ctx.input.groupId}**.`
    };
  })
  .build();
