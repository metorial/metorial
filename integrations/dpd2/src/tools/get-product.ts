import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProduct = SlateTool.create(spec, {
  name: 'Get Product',
  key: 'get_product',
  description: `Retrieve detailed information about a specific DPD product including pricing, description, SKU, file info, and image details. Product images are available at \`https://d2beuh40lcdzfb.cloudfront.net/products/{productId}/{size}/{imageFileName}\` with sizes from 50x50 to 1000x1000.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      productId: z.number().describe('The unique ID of the product to retrieve')
    })
  )
  .output(
    z.object({
      productId: z.number().describe('Unique product ID'),
      storefrontId: z.number().describe('Associated storefront ID'),
      name: z.string().describe('Product name'),
      description: z.string().describe('Short product description'),
      longDescription: z.string().describe('Full product description'),
      price: z.string().describe('Product price'),
      sku: z.string().describe('Product SKU'),
      weight: z.string().describe('Product weight'),
      visibility: z.number().describe('Visibility: 0=hidden, 1=displayed'),
      imageFileName: z.string().describe('Image file name'),
      mimeType: z.string().describe('File MIME type'),
      fileSize: z.number().describe('File size in bytes'),
      fileName: z.string().describe('Delivered file name'),
      prices: z
        .array(
          z.object({
            priceId: z.number().describe('Price variant ID'),
            name: z.string().describe('Price variant name'),
            price: z.string().describe('Price amount')
          })
        )
        .describe('Price variants'),
      createdAt: z.number().describe('Creation timestamp (UNIX)'),
      updatedAt: z.number().describe('Last updated timestamp (UNIX)'),
      imageUpdatedAt: z.number().describe('Image last updated timestamp (UNIX)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let product = await client.getProduct(ctx.input.productId);

    return {
      output: product,
      message: `Retrieved product **${product.name}** (ID: ${product.productId}, price: ${product.price}, SKU: ${product.sku || 'N/A'}).`
    };
  })
  .build();
