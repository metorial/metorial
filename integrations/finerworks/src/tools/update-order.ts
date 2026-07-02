import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateOrder = SlateTool.create(spec, {
  name: 'Update Order',
  key: 'update_order',
  description: `Change the submission status of an order or add notes to an order's log. Can place an order on hold, cancel it, or forward it to the fulfillment center. Notes can be added for internal reference. Status changes are only possible before the order enters production.`,
  instructions: [
    'Use "hold" to pause an order before production',
    'Use "cancel" to cancel an order before production',
    'Use "pending" to forward a held order to the fulfillment center',
    'Once an order is in production, status changes require contacting FinerWorks support'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      orderId: z.number().describe('FinerWorks order ID to update'),
      updateCommand: z
        .enum(['pending', 'hold', 'cancel'])
        .optional()
        .describe(
          'New order status: "pending" (forward to fulfillment), "hold" (pause order), "cancel" (cancel order)'
        ),
      note: z
        .object({
          subject: z.string().max(100).describe('Note subject line (max 100 characters)'),
          body: z.string().describe('Note message body')
        })
        .optional()
        .describe('Add a note to the order log')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was successful'),
      statusUpdated: z.boolean().describe('Whether the order status was changed'),
      noteAdded: z.boolean().describe('Whether a note was added'),
      message: z.string().optional().describe('API response message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      webApiKey: ctx.auth.webApiKey,
      appKey: ctx.auth.appKey,
      testMode: ctx.config.testMode
    });

    let statusUpdated = false;
    let noteAdded = false;
    let messages: string[] = [];

    if (ctx.input.updateCommand) {
      let result = await client.updateOrder(ctx.input.orderId, ctx.input.updateCommand);
      statusUpdated = result.success ?? false;
      if (result.message) messages.push(result.message);
    }

    if (ctx.input.note) {
      let result = await client.submitNote(
        ctx.input.orderId,
        ctx.input.note.subject,
        ctx.input.note.body
      );
      noteAdded = result.success ?? false;
      if (result.message) messages.push(result.message);
    }

    let success =
      (!ctx.input.updateCommand || statusUpdated) && (!ctx.input.note || noteAdded);

    let parts: string[] = [];
    if (statusUpdated) parts.push(`status changed to **${ctx.input.updateCommand}**`);
    if (noteAdded) parts.push(`note added with subject "${ctx.input.note!.subject}"`);

    return {
      output: {
        success,
        statusUpdated,
        noteAdded,
        message: messages.filter(Boolean).join('; ') || undefined
      },
      message: success
        ? `Order **${ctx.input.orderId}**: ${parts.join(' and ')}`
        : `Failed to update order ${ctx.input.orderId}: ${messages.join('; ')}`
    };
  })
  .build();
