import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageOrderTool = SlateTool.create(spec, {
  name: 'Manage Order',
  key: 'manage_order',
  description: `Confirm or cancel an existing order for an event. Provide the checkout ID and event ID along with comments. When confirming, you can optionally suppress the confirmation email to the buyer.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['confirm', 'cancel'])
        .describe('Action to perform: confirm or cancel the order'),
      checkoutId: z.number().describe('The checkout ID of the order'),
      eventId: z.number().describe('The event ID'),
      comments: z.string().describe('Comments for the order action'),
      sendEmail: z
        .boolean()
        .optional()
        .describe(
          'Whether to send confirmation email to buyer (only for confirm action, default: true)'
        )
    })
  )
  .output(
    z.object({
      result: z.string().describe('Result status of the action (e.g., "success")'),
      action: z.string().describe('The action performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result: string;

    if (ctx.input.action === 'confirm') {
      let data = await client.confirmOrder({
        checkoutId: ctx.input.checkoutId,
        eventId: ctx.input.eventId,
        comments: ctx.input.comments,
        sendEmail: ctx.input.sendEmail
      });
      result = data.orderconfirm ?? 'success';
    } else {
      let data = await client.cancelOrder({
        checkoutId: ctx.input.checkoutId,
        eventId: ctx.input.eventId,
        comments: ctx.input.comments
      });
      result = data.ordercancel ?? 'success';
    }

    return {
      output: {
        result,
        action: ctx.input.action
      },
      message: `Order **${ctx.input.checkoutId}** ${ctx.input.action === 'confirm' ? 'confirmed' : 'cancelled'} successfully.`
    };
  })
  .build();
