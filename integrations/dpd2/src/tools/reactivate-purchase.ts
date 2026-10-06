import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let reactivatePurchase = SlateTool.create(spec, {
  name: 'Reactivate Purchase',
  key: 'reactivate_purchase',
  description: `Reactivate a purchase in DPD. This can restore download access and trigger email or renewed fulfillment. DPD must acknowledge the request and the exact purchase is read back; email delivery and individual download access are not independently verified. Effects cannot be undone through this API.`,
  tags: {
    destructive: true
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
      status: z.string().describe('Provider acknowledgement: OK'),
      purchaseId: z.number().optional(),
      purchaseStatus: z.string().optional(),
      readbackConfirmed: z.boolean().optional(),
      refulfillRequested: z.boolean().optional(),
      deliveryVerified: z
        .boolean()
        .optional()
        .describe(
          'False: the API does not independently verify email or fulfillment delivery.'
        )
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
      message: `DPD acknowledged reactivation of purchase #${ctx.input.purchaseId}; its exact record was read back. Email and fulfillment delivery are not verified.`
    };
  })
  .build();
