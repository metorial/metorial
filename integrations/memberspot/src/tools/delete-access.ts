import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteAccessTool = SlateTool.create(spec, {
  name: 'Delete Course Access',
  key: 'delete_access',
  description:
    'Delete a member’s offer access or all access associated with an order. Unlike deactivating access, deletion removes the access assignment. Use manage_access to preserve the assignment.',
  tags: { destructive: true }
})
  .input(
    z.object({
      email: z.string().describe('Member email address'),
      scope: z
        .enum(['offer', 'order'])
        .describe('Delete all access for an offer or for an order'),
      offerId: z
        .string()
        .optional()
        .describe('Required for offer scope; discover IDs with list_offers'),
      orderId: z
        .string()
        .optional()
        .describe('Required for order scope; order ID supplied when granting access')
    })
  )
  .output(z.object({ result: z.any().optional().describe('Unmodified provider response') }))
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result: unknown;
    if (ctx.input.scope === 'offer') {
      if (!ctx.input.offerId?.trim())
        throw createApiServiceError('offerId is required when scope is "offer".');
      result = await client.setOfferState({
        email: ctx.input.email,
        offerId: ctx.input.offerId
      });
    } else {
      if (!ctx.input.orderId?.trim())
        throw createApiServiceError('orderId is required when scope is "order".');
      result = await client.setOrderState({
        email: ctx.input.email,
        orderId: ctx.input.orderId
      });
    }
    return {
      output: { result },
      message: `Deleted ${ctx.input.scope} access for **${ctx.input.email}**.`
    };
  })
  .build();
