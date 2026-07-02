import { SlateTool } from 'slates';
import { z } from 'zod';
import { SimpleroClient } from '../lib/client';
import { spec } from '../spec';

export let manageProduct = SlateTool.create(spec, {
  name: 'Manage Product',
  key: 'manage_product',
  description: `List products, get product details, and create free purchases for products in Simplero. Also supports searching and looking up existing purchases by email, ID, or token.`,
  instructions: [
    'Use action "list" to get all products and their IDs.',
    'Free purchases cannot be created on trial Simplero accounts.',
    'When searching purchases, you can filter by product, state, and date ranges.'
  ],
  constraints: ['Purchases cannot be created on trial accounts.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create_purchase', 'find_purchase', 'search_purchases'])
        .describe('Action to perform'),
      productId: z
        .string()
        .optional()
        .describe('Product ID (required for get, create_purchase, find_purchase)'),
      email: z.string().optional().describe('Contact email for purchase operations'),
      firstName: z.string().optional().describe('First name for purchase creation'),
      lastName: z.string().optional().describe('Last name for purchase creation'),
      skipContract: z.boolean().optional().describe('Skip contract for the purchase'),
      purchaseId: z.string().optional().describe('Purchase ID for lookup'),
      purchaseToken: z.string().optional().describe('Purchase token for lookup'),
      state: z
        .string()
        .optional()
        .describe('Filter purchases by state (e.g., active, canceled)'),
      createdStartAt: z
        .string()
        .optional()
        .describe('Filter purchases created after this date (ISO 8601)'),
      createdEndAt: z
        .string()
        .optional()
        .describe('Filter purchases created before this date (ISO 8601)'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      product: z.record(z.string(), z.unknown()).optional().describe('Product record'),
      products: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of product records'),
      purchase: z.record(z.string(), z.unknown()).optional().describe('Purchase record'),
      purchases: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of purchase records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SimpleroClient({
      token: ctx.auth.token,
      userAgent: ctx.config.userAgent
    });

    if (ctx.input.action === 'list') {
      let products = await client.listProducts({
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
      return {
        output: { products },
        message: `Found **${products.length}** product(s).`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.productId) throw new Error('productId is required.');
      let product = await client.getProduct(ctx.input.productId);
      return {
        output: { product },
        message: `Retrieved product **${product.name}** (ID: ${product.id}).`
      };
    }

    if (ctx.input.action === 'create_purchase') {
      if (!ctx.input.productId) throw new Error('productId is required.');
      if (!ctx.input.email) throw new Error('email is required.');
      let purchase = await client.createFreePurchase(ctx.input.productId, {
        email: ctx.input.email,
        firstName: ctx.input.firstName,
        lastName: ctx.input.lastName,
        skipContract: ctx.input.skipContract
      });
      return {
        output: { purchase },
        message: `Created purchase for **${ctx.input.email}** on product **${ctx.input.productId}**.`
      };
    }

    if (ctx.input.action === 'find_purchase') {
      if (!ctx.input.productId) throw new Error('productId is required.');
      let result = await client.findPurchase(ctx.input.productId, {
        email: ctx.input.email,
        purchaseId: ctx.input.purchaseId,
        purchaseToken: ctx.input.purchaseToken
      });
      let isArray = Array.isArray(result);
      return {
        output: isArray
          ? { purchases: result as Record<string, unknown>[] }
          : { purchase: result as Record<string, unknown> },
        message: isArray
          ? `Found **${(result as unknown[]).length}** purchase(s).`
          : `Found purchase (ID: ${(result as Record<string, unknown>).purchase_id}).`
      };
    }

    if (ctx.input.action === 'search_purchases') {
      let purchases = await client.searchPurchases({
        page: ctx.input.page,
        perPage: ctx.input.perPage,
        productId: ctx.input.productId,
        state: ctx.input.state,
        createdStartAt: ctx.input.createdStartAt,
        createdEndAt: ctx.input.createdEndAt
      });
      return {
        output: { purchases },
        message: `Found **${purchases.length}** purchase(s).`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
