import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateItem = SlateTool.create(spec, {
  name: 'Update Item',
  key: 'update_item',
  description: `Update properties of a Rollbar item, such as its status (resolve, mute, archive, reactivate), severity level, title, or assigned user.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      itemId: z.number().describe('Unique item ID to update'),
      status: z
        .enum(['active', 'resolved', 'muted', 'archived'])
        .optional()
        .describe('New status for the item'),
      level: z
        .enum(['debug', 'info', 'warning', 'error', 'critical'])
        .optional()
        .describe('New severity level'),
      title: z.string().optional().describe('New title for the item'),
      assignedUser: z.string().optional().describe('Username to assign the item to')
    })
  )
  .output(
    z.object({
      itemId: z.number().describe('Unique item ID'),
      counter: z.number().describe('Project-specific item counter'),
      title: z.string().describe('Item title/message'),
      status: z.string().describe('Current item status'),
      level: z.string().describe('Severity level')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let updateData: any = {};
    if (ctx.input.status) updateData.status = ctx.input.status;
    if (ctx.input.level) updateData.level = ctx.input.level;
    if (ctx.input.title) updateData.title = ctx.input.title;
    if (ctx.input.assignedUser) updateData.assigned_user = ctx.input.assignedUser;

    let result = await client.updateItem(ctx.input.itemId, updateData);
    let item = result?.result;

    return {
      output: {
        itemId: item.id,
        counter: item.counter,
        title: item.title,
        status: item.status,
        level: item.level_string || item.level
      },
      message: `Updated item **#${item.counter}**: "${item.title}" — status: ${item.status}, level: ${item.level_string || item.level}.`
    };
  })
  .build();
