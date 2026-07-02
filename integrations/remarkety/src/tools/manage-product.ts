import { SlateTool } from 'slates';
import { z } from 'zod';
import { formatProductPayload, RemarketyClient } from '../lib/client';
import { productSchema } from '../lib/schemas';
import { spec } from '../spec';

export let manageProductTool = SlateTool.create(spec, {
  name: 'Manage Product',
  key: 'manage_product',
  description: `Create, update, or delete a product in the Remarkety catalog. Supports full product details including variants, images, inventory, pricing, and categories. Product IDs should be consistent to avoid duplicates.`,
  instructions: [
    'For delete operations, only the productId is required.',
    'Product IDs in the catalog should match those referenced in order and cart line items.'
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
          .enum(['create', 'update', 'delete'])
          .describe('The action to perform on the product')
      })
      .merge(
        productSchema.partial().merge(
          z.object({
            productId: z.string().describe('Unique product ID')
          })
        )
      )
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

    let { action, ...productData } = ctx.input;
    let eventType = `products/${action}` as
      | 'products/create'
      | 'products/update'
      | 'products/delete';
    let payload = formatProductPayload(productData as unknown as Record<string, unknown>);

    ctx.info(`Sending ${eventType} event for product ${ctx.input.productId}`);

    await client.sendProductEvent(payload, eventType);

    return {
      output: {
        success: true,
        eventType
      },
      message: `Successfully sent **${eventType}** event for product **${ctx.input.productId}**${ctx.input.title ? ` (${ctx.input.title})` : ''}.`
    };
  })
  .build();
