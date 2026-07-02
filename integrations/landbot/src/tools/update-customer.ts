import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlatformClient } from '../lib/client';
import { spec } from '../spec';

export let updateCustomerTool = SlateTool.create(spec, {
  name: 'Update Customer',
  key: 'update_customer',
  description: `Update a customer's profile fields, assign them to a bot (optionally directing to a specific block), or unassign them from an agent. Combines field updates, bot assignment, and unassignment into a single flexible tool.`,
  instructions: [
    'To update fields, provide customerId and fields (key-value pairs).',
    'To assign a customer to a bot, provide customerId and botId. Optionally provide blockId to direct to a specific block in the bot flow.',
    'To unassign a customer from an agent, set unassign to true.',
    'You can combine field updates with assignment/unassignment in a single call.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      customerId: z.number().describe('Numeric ID of the customer to update'),
      fields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Key-value pairs of customer fields to update'),
      botId: z.number().optional().describe('Bot ID to assign the customer to'),
      blockId: z
        .string()
        .optional()
        .describe('Block ID within the bot flow to direct the customer to'),
      unassign: z
        .boolean()
        .optional()
        .describe('Set to true to unassign the customer from their current agent')
    })
  )
  .output(
    z.object({
      fieldsUpdated: z.boolean().describe('Whether fields were updated'),
      botAssigned: z.boolean().describe('Whether the customer was assigned to a bot'),
      unassigned: z.boolean().describe('Whether the customer was unassigned from an agent')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlatformClient(ctx.auth.token);

    let fieldsUpdated = false;
    let botAssigned = false;
    let unassigned = false;

    if (ctx.input.fields && Object.keys(ctx.input.fields).length > 0) {
      await client.updateCustomerFields(ctx.input.customerId, ctx.input.fields);
      fieldsUpdated = true;
    }

    if (ctx.input.botId) {
      await client.assignCustomerToBot(ctx.input.customerId, ctx.input.botId, {
        node: ctx.input.blockId
      });
      botAssigned = true;
    }

    if (ctx.input.unassign) {
      await client.unassignCustomer(ctx.input.customerId);
      unassigned = true;
    }

    let actions: string[] = [];
    if (fieldsUpdated) actions.push('updated fields');
    if (botAssigned) actions.push(`assigned to bot **#${ctx.input.botId}**`);
    if (unassigned) actions.push('unassigned from agent');

    return {
      output: {
        fieldsUpdated,
        botAssigned,
        unassigned
      },
      message:
        actions.length > 0
          ? `Customer **#${ctx.input.customerId}**: ${actions.join(', ')}.`
          : `No updates were performed on customer **#${ctx.input.customerId}**.`
    };
  });
