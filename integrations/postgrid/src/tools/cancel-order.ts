import { SlateTool } from 'slates';
import { z } from 'zod';
import { PrintMailClient } from '../lib/client';
import { spec } from '../spec';

export let cancelOrder = SlateTool.create(spec, {
  name: 'Cancel Mail Order',
  key: 'cancel_order',
  description: `Cancel a PostGrid mail order that has not yet been printed. Only orders with status "ready" can be cancelled. Supports letters, postcards, cheques, and self-mailers.`,
  constraints: [
    'Only orders with status "ready" can be cancelled. Orders already in printing or later stages cannot be cancelled.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      orderId: z.string().describe('The order ID to cancel (e.g., letter_abc123)'),
      orderType: z
        .enum(['letter', 'postcard', 'cheque', 'self_mailer'])
        .optional()
        .describe('Order type. Auto-detected from ID prefix if not provided.')
    })
  )
  .output(
    z.object({
      orderId: z.string().describe('Cancelled order ID'),
      orderType: z.string().describe('Type of the mail order'),
      status: z.string().describe('Updated status (should be "cancelled")')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PrintMailClient(ctx.auth.token);
    let { orderId, orderType } = ctx.input;

    if (!orderType) {
      if (orderId.startsWith('letter_')) orderType = 'letter';
      else if (orderId.startsWith('postcard_')) orderType = 'postcard';
      else if (orderId.startsWith('cheque_')) orderType = 'cheque';
      else if (orderId.startsWith('self_mailer_')) orderType = 'self_mailer';
      else
        throw new Error(
          `Could not determine order type from ID "${orderId}". Please specify orderType.`
        );
    }

    let result: any;
    switch (orderType) {
      case 'letter':
        result = await client.cancelLetter(orderId);
        break;
      case 'postcard':
        result = await client.cancelPostcard(orderId);
        break;
      case 'cheque':
        result = await client.cancelCheque(orderId);
        break;
      case 'self_mailer':
        result = await client.cancelSelfMailer(orderId);
        break;
    }

    return {
      output: {
        orderId: result.id,
        orderType: orderType!,
        status: result.status
      },
      message: `**${orderType}** ${result.id} has been **cancelled**.`
    };
  })
  .build();
