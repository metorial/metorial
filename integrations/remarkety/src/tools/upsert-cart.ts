import { SlateTool } from 'slates';
import { z } from 'zod';
import { formatCartPayload, RemarketyClient } from '../lib/client';
import { cartSchema } from '../lib/schemas';
import { spec } from '../spec';

export let upsertCartTool = SlateTool.create(spec, {
  name: 'Create or Update Cart',
  key: 'upsert_cart',
  description: `Send a cart creation or update event to Remarkety to enable abandoned cart recovery campaigns. Cart data includes line items, pricing, customer information, and an optional abandoned checkout URL for recovery links. Keep the same cart ID across updates to avoid duplicates.`,
  instructions: [
    'Use the same cartId for all updates to a given cart to prevent duplicates.',
    'For anonymous carts, the email and customer fields can be null.',
    'Once a cart becomes an order, use the order tool instead.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z
      .object({
        action: z
          .enum(['create', 'update'])
          .describe('Whether to create a new cart or update an existing one')
      })
      .merge(cartSchema)
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the event was sent successfully'),
      eventType: z.string().describe('The event type that was sent')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RemarketyClient({
      token: ctx.auth.token,
      storeId: ctx.auth.storeId,
      storeDomain: ctx.config.storeDomain,
      platform: ctx.config.platform
    });

    let isCreate = ctx.input.action === 'create';
    let { action, ...cartData } = ctx.input;
    let payload = formatCartPayload(cartData as unknown as Record<string, unknown>);
    let eventType = isCreate ? 'carts/create' : 'carts/update';

    ctx.info(`Sending ${eventType} event for cart ${ctx.input.cartId}`);

    await client.createOrUpdateCart(payload, isCreate);

    return {
      output: {
        success: true,
        eventType
      },
      message: `Successfully sent **${eventType}** event for cart **${ctx.input.cartId}**.`
    };
  })
  .build();
