import { SlateTool } from 'slates';
import { z } from 'zod';
import { woocommerceServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createRefund = SlateTool.create(spec, {
  name: 'Create Refund',
  key: 'create_refund',
  description: `Issue a refund for an order. Specify the refund amount and optionally refund specific line items. Can also list existing refunds for an order.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      orderId: z.number().describe('The order ID to refund'),
      action: z.enum(['list', 'create']).describe('List existing refunds or create a new one'),
      amount: z.string().optional().describe('Refund amount (required for create)'),
      reason: z.string().optional().describe('Reason for the refund'),
      lineItems: z
        .array(
          z.object({
            lineItemId: z.number().describe('Line item ID to refund'),
            quantity: z.number().optional().describe('Quantity to refund'),
            refundTotal: z.string().optional().describe('Refund total for this item')
          })
        )
        .optional()
        .describe('Specific line items to refund'),
      apiRefund: z
        .boolean()
        .optional()
        .default(true)
        .describe('Process the refund through the payment gateway')
    })
  )
  .output(
    z.object({
      refunds: z
        .array(
          z.object({
            refundId: z.number(),
            amount: z.string(),
            reason: z.string(),
            dateCreated: z.string()
          })
        )
        .optional(),
      refund: z
        .object({
          refundId: z.number(),
          amount: z.string(),
          reason: z.string(),
          dateCreated: z.string()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.action === 'list') {
      let refunds = await client.listOrderRefunds(ctx.input.orderId);
      let mapped = refunds.map((r: any) => ({
        refundId: r.id,
        amount: r.amount || '0',
        reason: r.reason || '',
        dateCreated: r.date_created || ''
      }));

      return {
        output: { refunds: mapped },
        message: `Found **${mapped.length}** refunds for order #${ctx.input.orderId}.`
      };
    }

    if (!ctx.input.amount)
      throw woocommerceServiceError('amount is required for create action');

    let data: Record<string, any> = {
      amount: ctx.input.amount,
      api_refund: ctx.input.apiRefund
    };

    if (ctx.input.reason) data.reason = ctx.input.reason;
    if (ctx.input.lineItems) {
      data.line_items = ctx.input.lineItems.map(li => ({
        id: li.lineItemId,
        ...(li.quantity !== undefined ? { quantity: li.quantity } : {}),
        ...(li.refundTotal !== undefined ? { refund_total: li.refundTotal } : {})
      }));
    }

    let refund = await client.createOrderRefund(ctx.input.orderId, data);

    return {
      output: {
        refund: {
          refundId: refund.id,
          amount: refund.amount || '0',
          reason: refund.reason || '',
          dateCreated: refund.date_created || ''
        }
      },
      message: `Created refund of **${refund.amount}** for order #${ctx.input.orderId}${ctx.input.reason ? ` (reason: ${ctx.input.reason})` : ''}.`
    };
  })
  .build();
