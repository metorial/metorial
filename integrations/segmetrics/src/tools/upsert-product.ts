import { SlateTool } from 'slates';
import { z } from 'zod';
import { ImportClient } from '../lib/client';
import { spec } from '../spec';

export let upsertProduct = SlateTool.create(spec, {
  name: 'Create or Update Product',
  key: 'upsert_product',
  description: `Creates a new product or updates an existing one in a SegMetrics integration. Products are referenced by invoices and subscriptions. If the product ID already exists, the product will be updated.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      productId: z.string().describe('Unique identifier for the product.'),
      productName: z.string().describe('Name of the product.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful.'),
      response: z.unknown().optional().describe('Raw API response.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ImportClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      integrationId: ctx.config.integrationId!
    });

    let response = await client.upsertProduct({
      id: ctx.input.productId,
      name: ctx.input.productName
    });

    return {
      output: {
        success: true,
        response
      },
      message: `Product **${ctx.input.productName}** (${ctx.input.productId}) has been created or updated.`
    };
  })
  .build();
