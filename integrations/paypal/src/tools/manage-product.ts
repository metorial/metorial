import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { PayPalClient } from '../lib/client';
import { paypalServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageProduct = SlateTool.create(spec, {
  name: 'Manage Product',
  key: 'manage_product',
  description: `Create, retrieve, or list PayPal catalog products. Products are used as the basis for billing plans and subscriptions.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'get', 'list']).describe('Action to perform'),
      productId: z.string().optional().describe('Product ID (required for get)'),
      name: z.string().optional().describe('Product name (required for create)'),
      description: z.string().optional().describe('Product description'),
      type: z
        .enum(['PHYSICAL', 'DIGITAL', 'SERVICE'])
        .optional()
        .describe('Product type (required for create)'),
      category: z.string().optional().describe('Product category (e.g. SOFTWARE, SERVICES)'),
      imageUrl: z.string().optional().describe('Product image URL'),
      homeUrl: z.string().optional().describe('Product home page URL'),
      page: z.number().optional().describe('Page number for listing'),
      pageSize: z.number().optional().describe('Page size for listing')
    })
  )
  .output(
    z.object({
      productId: z.string().optional().describe('Product ID'),
      name: z.string().optional().describe('Product name'),
      type: z.string().optional().describe('Product type'),
      description: z.string().optional().describe('Product description'),
      products: z
        .array(
          z.object({
            productId: z.string().describe('Product ID'),
            name: z.string().describe('Product name'),
            type: z.string().optional().describe('Product type'),
            description: z.string().optional().describe('Product description')
          })
        )
        .optional()
        .describe('List of products'),
      product: z.any().optional().describe('Full product details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PayPalClient({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId,
      clientSecret: ctx.auth.clientSecret,
      environment: ctx.auth.environment
    });

    switch (ctx.input.action) {
      case 'create': {
        if (!ctx.input.name || !ctx.input.type) {
          throw paypalServiceError('name and type are required for create action');
        }
        let product = await client.createProduct({
          name: ctx.input.name,
          type: ctx.input.type,
          description: ctx.input.description,
          category: ctx.input.category,
          imageUrl: ctx.input.imageUrl,
          homeUrl: ctx.input.homeUrl
        });
        product = await client.getProduct(product.id);
        return {
          output: {
            productId: product.id,
            name: product.name,
            type: product.type,
            description: product.description,
            product
          },
          message: `Product \`${product.id}\` (**${product.name}**) created.`
        };
      }
      case 'get': {
        if (!ctx.input.productId)
          throw paypalServiceError('productId is required for get action');
        let product = await client.getProduct(ctx.input.productId);
        return {
          output: {
            productId: product.id,
            name: product.name,
            type: product.type,
            description: product.description,
            product
          },
          message: `Product \`${product.id}\` (**${product.name}**) - Type: ${product.type}.`
        };
      }
      case 'list': {
        let result = await client.listProducts({
          page: ctx.input.page,
          pageSize: ctx.input.pageSize,
          totalRequired: true
        });
        let products = (result.products || []) as any[];
        return {
          output: {
            products: products.map((p: any) => ({
              productId: p.id,
              name: p.name,
              type: p.type,
              description: p.description
            }))
          },
          message: `Found ${products.length} product(s).`
        };
      }
    }
  })
  .build();
