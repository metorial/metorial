import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ShopifyClient } from '../lib/client';
import { spec } from '../spec';

export let deleteProduct = SlateTool.create(spec, {
  name: 'Delete Product',
  key: 'delete_product',
  description: `Permanently delete a product and all its variants from the Shopify store. This action cannot be undone.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      productId: z.string().describe('Shopify product ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShopifyClient({
      token: ctx.auth.token,
      shopDomain: ctx.config.shopDomain,
      apiVersion: ctx.config.apiVersion
    });

    await client.deleteProduct(ctx.input.productId);

    return {
      output: { deleted: true },
      message: `Deleted product **${ctx.input.productId}**.`
    };
  })
  .build();
