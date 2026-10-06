import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { purchaseSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getPurchase = SlateTool.create(spec, {
  name: 'Get Purchase',
  key: 'get_purchase',
  description: `Retrieve detailed information about a specific purchase/order, including buyer details, line items with product keys, exact money strings, custom fields, coupons, and shipping counts when provided.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      purchaseId: z.number().describe('The unique ID of the purchase to retrieve')
    })
  )
  .output(purchaseSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let purchase = await client.getPurchase(ctx.input.purchaseId);

    return {
      output: purchase,
      message: `Retrieved purchase #${purchase.purchaseId}.`
    };
  })
  .build();
