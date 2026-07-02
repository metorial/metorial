import { SlateTool } from 'slates';
import { z } from 'zod';
import { GumroadClient } from '../lib/client';
import { spec } from '../spec';

export let manageProduct = SlateTool.create(spec, {
  name: 'Manage Product',
  key: 'manage_product',
  description: `Enable, disable, or delete a Gumroad product. Use this to control product visibility and lifecycle. Note: creating new products is not supported via the API.`,
  instructions: [
    'Use "enable" to publish/make a product visible.',
    'Use "disable" to unpublish/hide a product.',
    'Use "delete" to permanently remove a product.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      productId: z.string().describe('The product ID to manage'),
      action: z
        .enum(['enable', 'disable', 'delete'])
        .describe('Action to perform on the product')
    })
  )
  .output(
    z.object({
      productId: z.string().describe('The managed product ID'),
      name: z.string().optional().describe('Product name'),
      published: z.boolean().optional().describe('Whether the product is now published'),
      deleted: z.boolean().optional().describe('Whether the product was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GumroadClient({ token: ctx.auth.token });
    let { productId, action } = ctx.input;

    if (action === 'delete') {
      await client.deleteProduct(productId);
      return {
        output: { productId, deleted: true },
        message: `Product **${productId}** has been deleted.`
      };
    }

    let product: any;
    if (action === 'enable') {
      product = await client.enableProduct(productId);
    } else {
      product = await client.disableProduct(productId);
    }

    return {
      output: {
        productId: product.id || productId,
        name: product.name || undefined,
        published: product.published
      },
      message: `Product **${product.name || productId}** has been ${action}d.`
    };
  })
  .build();
