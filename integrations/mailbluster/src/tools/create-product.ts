import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createProduct = SlateTool.create(spec, {
  name: 'Create Product',
  key: 'create_product',
  description: `Creates a new product for e-commerce tracking within MailBluster. Products can be referenced in orders to track revenue attribution for email campaigns.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      productId: z.string().describe('Unique identifier for the product'),
      name: z.string().describe('Name of the product')
    })
  )
  .output(
    z.object({
      productId: z.string().describe('ID of the created product'),
      name: z.string().describe('Name of the product'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let product = await client.createProduct({
      id: ctx.input.productId,
      name: ctx.input.name
    });

    return {
      output: {
        productId: product.id,
        name: product.name,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt
      },
      message: `Product **${product.name}** (${product.id}) created successfully.`
    };
  })
  .build();
