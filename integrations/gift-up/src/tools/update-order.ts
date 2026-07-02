import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateOrder = SlateTool.create(spec, {
  name: 'Update Order',
  key: 'update_order',
  description: `Update order details, add notes, or mark a postal order as posted. Supports updating purchaser info, adding annotations, and marking physical gift cards as shipped.`,
  instructions: [
    'To add a note, provide the **note** field. Notes are limited to 500 characters.',
    'To mark a postal order as posted, set **markAsPosted** to true.'
  ]
})
  .input(
    z.object({
      orderId: z.string().describe('The order ID to update'),
      purchaserEmail: z.string().optional().describe('New purchaser email'),
      purchaserName: z.string().optional().describe('New purchaser name'),
      note: z.string().optional().describe('Add a note to the order (max 500 characters)'),
      markAsPosted: z.boolean().optional().describe('Mark a postal order as posted/shipped')
    })
  )
  .output(
    z
      .object({
        orderId: z.string().describe('Order ID'),
        orderNumber: z.string().describe('Order number'),
        purchaserEmail: z.string().describe('Purchaser email'),
        purchaserName: z.string().describe('Purchaser name')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      testMode: ctx.config.testMode
    });

    let actions: string[] = [];

    // Update purchaser info via PATCH
    let patches: Array<{ op: string; path: string; value: any }> = [];
    if (ctx.input.purchaserEmail !== undefined) {
      patches.push({
        op: 'replace',
        path: '/purchaseremail',
        value: ctx.input.purchaserEmail
      });
    }
    if (ctx.input.purchaserName !== undefined) {
      patches.push({ op: 'replace', path: '/purchasername', value: ctx.input.purchaserName });
    }
    if (patches.length > 0) {
      await client.updateOrder(ctx.input.orderId, patches);
      actions.push('updated purchaser info');
    }

    // Add note
    if (ctx.input.note) {
      await client.addOrderNote(ctx.input.orderId, ctx.input.note);
      actions.push('added note');
    }

    // Mark as posted
    if (ctx.input.markAsPosted) {
      await client.markOrderPosted(ctx.input.orderId);
      actions.push('marked as posted');
    }

    let order = await client.getOrder(ctx.input.orderId);

    return {
      output: {
        ...order,
        orderId: order.id
      },
      message: `Updated order **#${order.orderNumber}**: ${actions.join(', ')}`
    };
  })
  .build();
