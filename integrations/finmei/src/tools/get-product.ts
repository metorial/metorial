import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import {
  FinmeiClient,
  optionalNumber,
  optionalString,
  optionalTimestamp,
  readEntity,
  requireId
} from '../lib/client';
import { spec } from '../spec';

export let getProduct = SlateTool.create(spec, {
  name: 'Get Product',
  key: 'get_product',
  description: `Retrieve detailed information about a specific product by its ID from the Finmei product catalog.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      productId: z.string().describe('ID of the product to retrieve')
    })
  )
  .output(
    z.object({
      productId: z.string().describe('Product ID'),
      name: z.string().optional().describe('Product name'),
      price: z.number().optional().describe('Product price'),
      currency: z.string().optional().describe('Currency code'),
      description: z.string().optional().describe('Product description'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      rawProduct: z.any().optional().describe('Full product data from API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FinmeiClient(ctx.auth.token);

    let result = await client.getProduct(ctx.input.productId);
    let product = readEntity(result, 'product');

    return {
      output: {
        productId: requireId(product.id, 'product ID'),
        ...pickDefined({
          name: optionalString(product.name, 'product name'),
          price: optionalNumber(product.price, 'product price'),
          currency: optionalString(product.currency, 'product currency'),
          description: optionalString(product.description, 'product description'),
          createdAt: optionalTimestamp(product.created_at, 'creation timestamp'),
          updatedAt: optionalTimestamp(product.updated_at, 'update timestamp'),
          rawProduct: product
        })
      },
      message: `Retrieved product **${product?.name ?? ctx.input.productId}**.`
    };
  })
  .build();
