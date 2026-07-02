import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let userGroupItemSchema = z.object({
  groupItemId: z.number().describe('Group item identifier'),
  userId: z.number().describe('Assigned user identifier'),
  groupId: z.number().describe('Parent group identifier'),
  groupName: z.string().nullable().describe('Group display name'),
  name: z.string().describe('Group item display name'),
  createdAt: z.string().nullable().describe('Assignment creation timestamp (UTC)')
});

export let listUserGroupItems = SlateTool.create(spec, {
  name: 'List User Group Items',
  key: 'list_user_group_items',
  description: `Retrieve all group items assigned to a specific user. Shows which groups and group items a user belongs to.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.number().describe('ID of the user')
    })
  )
  .output(
    z.object({
      groupItems: z.array(userGroupItemSchema).describe('Group items assigned to the user')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let items = await client.listUserGroupItems(ctx.input.userId);

    let mapped = (Array.isArray(items) ? items : []).map((i: any) => ({
      groupItemId: i.id,
      userId: i.user_id,
      groupId: i.group_id,
      groupName: i.group_name ?? null,
      name: i.name,
      createdAt: i.created_at ?? null
    }));

    return {
      output: { groupItems: mapped },
      message: `User **${ctx.input.userId}** belongs to **${mapped.length}** group items.`
    };
  })
  .build();

export let assignGroupItemToUser = SlateTool.create(spec, {
  name: 'Assign Group Item to User',
  key: 'assign_group_item_to_user',
  description: `Assign a group item to a user. This associates the user with an organizational group for filtering and segmenting KPI data.`
})
  .input(
    z.object({
      userId: z.number().describe('ID of the user'),
      groupItemId: z.number().describe('ID of the group item to assign')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the assignment was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    await client.assignGroupItemToUser(ctx.input.userId, ctx.input.groupItemId);

    return {
      output: { success: true },
      message: `Assigned group item **${ctx.input.groupItemId}** to user **${ctx.input.userId}**.`
    };
  })
  .build();

export let removeGroupItemFromUser = SlateTool.create(spec, {
  name: 'Remove Group Item from User',
  key: 'remove_group_item_from_user',
  description: `Remove a group item assignment from a user.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      userId: z.number().describe('ID of the user'),
      groupItemId: z.number().describe('ID of the group item to remove')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the removal was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    await client.removeGroupItemFromUser(ctx.input.userId, ctx.input.groupItemId);

    return {
      output: { success: true },
      message: `Removed group item **${ctx.input.groupItemId}** from user **${ctx.input.userId}**.`
    };
  })
  .build();
