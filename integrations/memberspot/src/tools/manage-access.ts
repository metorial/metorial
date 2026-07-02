import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageAccessTool = SlateTool.create(spec, {
  name: 'Manage Course Access',
  key: 'manage_access',
  description: `Activate or deactivate a member's access at the offer or order level. Use **offer** scope to toggle all access for a given offer, or **order** scope to toggle access for a specific order. Deactivating access preserves the member's course progress.`,
  instructions: [
    'Use scope "offer" with an offerId to manage access at the offer level.',
    'Use scope "order" with an orderId to manage access at the order level.'
  ]
})
  .input(
    z.object({
      email: z.string().describe('Email address of the member'),
      scope: z
        .enum(['offer', 'order'])
        .describe('Whether to manage access at the offer or order level'),
      offerId: z.string().optional().describe('Offer ID (required when scope is "offer")'),
      orderId: z.string().optional().describe('Order ID (required when scope is "order")'),
      active: z.boolean().describe('Set to true to activate access, false to deactivate')
    })
  )
  .output(
    z.object({
      result: z.record(z.string(), z.any()).describe('Result of the access state change')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result: any;

    if (ctx.input.scope === 'offer') {
      if (!ctx.input.offerId) {
        throw new Error('offerId is required when scope is "offer"');
      }
      result = await client.setOfferState({
        email: ctx.input.email,
        offerId: ctx.input.offerId,
        active: ctx.input.active
      });
    } else {
      if (!ctx.input.orderId) {
        throw new Error('orderId is required when scope is "order"');
      }
      result = await client.setOrderState({
        email: ctx.input.email,
        orderId: ctx.input.orderId,
        active: ctx.input.active
      });
    }

    let action = ctx.input.active ? 'Activated' : 'Deactivated';
    let scopeId = ctx.input.scope === 'offer' ? ctx.input.offerId : ctx.input.orderId;

    return {
      output: { result },
      message: `${action} ${ctx.input.scope} access for **${ctx.input.email}** (${ctx.input.scope}: ${scopeId}).`
    };
  })
  .build();
