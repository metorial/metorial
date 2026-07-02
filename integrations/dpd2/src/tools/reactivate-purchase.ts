import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let reactivatePurchase = SlateTool.create(spec, {
  name: 'Reactivate Purchase',
  key: 'reactivate_purchase',
  description: `Reactivate a purchase in DPD. This re-enables access to the purchased digital products and optionally re-sends the fulfillment email. This is the only write operation available in the DPD API.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      purchaseId: z.number().describe('The unique ID of the purchase to reactivate'),
      customerEmail: z
        .string()
        .optional()
        .describe(
          'Customer email to send the reactivation to. Defaults to the email on the original purchase.'
        ),
      refulfill: z
        .boolean()
        .optional()
        .describe('Set to true to re-send the fulfillment/download email')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Result status (OK on success)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let result = await client.reactivatePurchase(
      ctx.input.purchaseId,
      ctx.input.customerEmail,
      ctx.input.refulfill
    );

    return {
      output: result,
      message: `Purchase **#${ctx.input.purchaseId}** has been reactivated${ctx.input.refulfill ? ' with re-fulfillment' : ''}.`
    };
  })
  .build();
