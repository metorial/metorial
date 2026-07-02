import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteProduct = SlateTool.create(spec, {
  name: 'Delete Product',
  key: 'delete_product',
  description: `Delete a product from your Zylvie store. If the product has paid transactions or active subscriptions, it will be archived instead of deleted (marked as unpublished, unlisted, and unfeatured).`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      productId: z.string().describe('ID of the product to delete')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Status of the operation'),
      message: z.string().describe('Result message from the server')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.deleteProduct(ctx.input.productId);

    return {
      output: {
        status: result.status,
        message: result.message
      },
      message: `${result.message} (product ID: \`${ctx.input.productId}\`).`
    };
  })
  .build();
