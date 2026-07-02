import { SlateTool } from 'slates';
import { z } from 'zod';
import { CertCentralClient } from '../lib/client';
import { spec } from '../spec';

export let cancelOrder = SlateTool.create(spec, {
  name: 'Cancel Order',
  key: 'cancel_order',
  description: `Cancel a pending certificate order in DigiCert CertCentral. Only orders that have not yet been issued can be canceled.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      orderId: z.string().describe('Order ID to cancel'),
      note: z.string().optional().describe('Reason for cancellation')
    })
  )
  .output(
    z.object({
      orderId: z.string().describe('Canceled order ID'),
      canceled: z.boolean().describe('Whether the order was canceled')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CertCentralClient({
      token: ctx.auth.token,
      platform: ctx.config.platform
    });

    ctx.progress('Canceling order...');
    await client.cancelOrder(ctx.input.orderId, ctx.input.note);

    return {
      output: {
        orderId: ctx.input.orderId,
        canceled: true
      },
      message: `Order **#${ctx.input.orderId}** has been canceled.`
    };
  })
  .build();
