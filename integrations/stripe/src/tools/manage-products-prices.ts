import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { StripeClient } from '../lib/client';
import { stripeServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageProductsPrices = SlateTool.create(spec, {
  name: 'Manage Products & Prices',
  key: 'manage_products_prices',
  description: `Create, retrieve, update, or delete products and their associated prices. Products represent goods or services, and prices define how much and how often to charge. Supports one-time and recurring pricing models.`,
  instructions: [
    'Price amounts are in the smallest currency unit (e.g., cents for USD).',
    'Prices are immutable after creation — to change pricing, create a new price and update subscriptions.',
    'A product can have multiple prices (e.g., monthly and yearly billing).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      resource: z.enum(['product', 'price']).describe('Resource type to operate on'),
      action: z
        .enum(['create', 'get', 'update', 'delete', 'list'])
        .describe('Operation to perform'),
      // Product fields
      productId: z.string().optional().describe('Product ID'),
      name: z.string().optional().describe('Product name (for product create/update)'),
      productDescription: z.string().optional().describe('Product description'),
      active: z.boolean().optional().describe('Whether the product/price is active'),
      images: z.array(z.string()).optional().describe('Product image URLs (up to 8)'),
      // Price fields
      priceId: z.string().optional().describe('Price ID'),
      unitAmount: z.number().optional().describe('Price amount in smallest currency unit'),
      currency: z.string().optional().describe('Three-letter ISO currency code'),
      recurring: z
        .object({
          interval: z.enum(['day', 'week', 'month', 'year']).describe('Billing interval'),
          intervalCount: z
            .number()
            .optional()
            .describe('Number of intervals between billings (default 1)')
        })
        .optional()
        .describe('Recurring pricing configuration (omit for one-time prices)'),
      billingScheme: z
        .enum(['per_unit', 'tiered'])
        .optional()
        .describe('How to compute the price'),
      metadata: z.record(z.string(), z.string()).optional().describe('Key-value metadata'),
      limit: z.number().optional().describe('Max results (for list)'),
      startingAfter: z.string().optional().describe('Cursor for pagination')
    })
  )
  .output(
    z.object({
      // Product output
      productId: z.string().optional().describe('Product ID'),
      name: z.string().optional().describe('Product name'),
      productDescription: z.string().optional().nullable().describe('Product description'),
      productActive: z.boolean().optional().describe('Whether the product is active'),
      deleted: z.boolean().optional().describe('Whether the resource was deleted'),
      // Price output
      priceId: z.string().optional().describe('Price ID'),
      unitAmount: z
        .number()
        .optional()
        .nullable()
        .describe('Unit amount in smallest currency unit'),
      currency: z.string().optional().describe('Currency code'),
      priceType: z.string().optional().describe('Price type (one_time or recurring)'),
      interval: z.string().optional().nullable().describe('Recurring interval'),
      priceActive: z.boolean().optional().describe('Whether the price is active'),
      // Lists
      products: z
        .array(
          z.object({
            productId: z.string(),
            name: z.string(),
            active: z.boolean(),
            created: z.number()
          })
        )
        .optional()
        .describe('List of products'),
      prices: z
        .array(
          z.object({
            priceId: z.string(),
            productId: z.string(),
            unitAmount: z.number().nullable(),
            currency: z.string(),
            priceType: z.string(),
            active: z.boolean()
          })
        )
        .optional()
        .describe('List of prices'),
      hasMore: z.boolean().optional().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StripeClient({
      token: ctx.auth.token,
      stripeAccountId: ctx.config.stripeAccountId
    });

    let { resource, action } = ctx.input;

    if (resource === 'product') {
      if (action === 'create') {
        if (!ctx.input.name) throw stripeServiceError('name is required for product creation');
        let params: Record<string, any> = { name: ctx.input.name };
        if (ctx.input.productDescription) params.description = ctx.input.productDescription;
        if (ctx.input.active !== undefined) params.active = ctx.input.active;
        if (ctx.input.images) params.images = ctx.input.images;
        if (ctx.input.metadata) params.metadata = ctx.input.metadata;

        let product = await client.createProduct(params);
        return {
          output: {
            productId: product.id,
            name: product.name,
            productDescription: product.description,
            productActive: product.active
          },
          message: `Created product **${product.name}** (${product.id})`
        };
      }

      if (action === 'get') {
        if (!ctx.input.productId)
          throw stripeServiceError('productId is required for get action');
        let product = await client.getProduct(ctx.input.productId);
        return {
          output: {
            productId: product.id,
            name: product.name,
            productDescription: product.description,
            productActive: product.active
          },
          message: `Product **${product.name}** — ${product.active ? 'active' : 'inactive'}`
        };
      }

      if (action === 'update') {
        if (!ctx.input.productId)
          throw stripeServiceError('productId is required for update action');
        let params: Record<string, any> = {};
        if (ctx.input.name) params.name = ctx.input.name;
        if (ctx.input.productDescription) params.description = ctx.input.productDescription;
        if (ctx.input.active !== undefined) params.active = ctx.input.active;
        if (ctx.input.images) params.images = ctx.input.images;
        if (ctx.input.metadata) params.metadata = ctx.input.metadata;

        let product = await client.updateProduct(ctx.input.productId, params);
        return {
          output: {
            productId: product.id,
            name: product.name,
            productDescription: product.description,
            productActive: product.active
          },
          message: `Updated product **${product.name}**`
        };
      }

      if (action === 'delete') {
        if (!ctx.input.productId)
          throw stripeServiceError('productId is required for delete action');
        let result = await client.deleteProduct(ctx.input.productId);
        return {
          output: { productId: result.id, deleted: result.deleted },
          message: `Deleted product **${ctx.input.productId}**`
        };
      }

      // list
      let params: Record<string, any> = {};
      if (ctx.input.limit) params.limit = ctx.input.limit;
      if (ctx.input.startingAfter) params.starting_after = ctx.input.startingAfter;
      if (ctx.input.active !== undefined) params.active = ctx.input.active;

      let result = await client.listProducts(params);
      return {
        output: {
          products: result.data.map((p: any) => ({
            productId: p.id,
            name: p.name,
            active: p.active,
            created: p.created
          })),
          hasMore: result.has_more
        },
        message: `Found **${result.data.length}** product(s)${result.has_more ? ' (more available)' : ''}`
      };
    }

    // Price operations
    if (action === 'create') {
      if (!ctx.input.productId)
        throw stripeServiceError('productId is required for price creation');
      if (ctx.input.unitAmount === undefined)
        throw stripeServiceError('unitAmount is required for price creation');
      if (!ctx.input.currency)
        throw stripeServiceError('currency is required for price creation');

      let params: Record<string, any> = {
        product: ctx.input.productId,
        unit_amount: ctx.input.unitAmount,
        currency: ctx.input.currency
      };
      if (ctx.input.recurring) {
        params.recurring = {
          interval: ctx.input.recurring.interval,
          interval_count: ctx.input.recurring.intervalCount
        };
      }
      if (ctx.input.billingScheme) params.billing_scheme = ctx.input.billingScheme;
      if (ctx.input.active !== undefined) params.active = ctx.input.active;
      if (ctx.input.metadata) params.metadata = ctx.input.metadata;

      let price = await client.createPrice(params);
      return {
        output: {
          priceId: price.id,
          productId: typeof price.product === 'string' ? price.product : price.product?.id,
          unitAmount: price.unit_amount,
          currency: price.currency,
          priceType: price.type,
          interval: price.recurring?.interval || null,
          priceActive: price.active
        },
        message: `Created price **${price.id}**: ${price.unit_amount} ${price.currency.toUpperCase()}${price.recurring ? ` / ${price.recurring.interval}` : ' (one-time)'}`
      };
    }

    if (action === 'get') {
      if (!ctx.input.priceId) throw stripeServiceError('priceId is required for get action');
      let price = await client.getPrice(ctx.input.priceId);
      return {
        output: {
          priceId: price.id,
          productId: typeof price.product === 'string' ? price.product : price.product?.id,
          unitAmount: price.unit_amount,
          currency: price.currency,
          priceType: price.type,
          interval: price.recurring?.interval || null,
          priceActive: price.active
        },
        message: `Price **${price.id}**: ${price.unit_amount} ${price.currency.toUpperCase()}`
      };
    }

    if (action === 'update') {
      if (!ctx.input.priceId)
        throw stripeServiceError('priceId is required for update action');
      let params: Record<string, any> = {};
      if (ctx.input.active !== undefined) params.active = ctx.input.active;
      if (ctx.input.metadata) params.metadata = ctx.input.metadata;

      let price = await client.updatePrice(ctx.input.priceId, params);
      return {
        output: {
          priceId: price.id,
          unitAmount: price.unit_amount,
          currency: price.currency,
          priceType: price.type,
          priceActive: price.active
        },
        message: `Updated price **${price.id}**`
      };
    }

    // list
    let params: Record<string, any> = {};
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.startingAfter) params.starting_after = ctx.input.startingAfter;
    if (ctx.input.productId) params.product = ctx.input.productId;
    if (ctx.input.active !== undefined) params.active = ctx.input.active;

    let result = await client.listPrices(params);
    return {
      output: {
        prices: result.data.map((p: any) => ({
          priceId: p.id,
          productId: typeof p.product === 'string' ? p.product : p.product?.id,
          unitAmount: p.unit_amount,
          currency: p.currency,
          priceType: p.type,
          active: p.active
        })),
        hasMore: result.has_more
      },
      message: `Found **${result.data.length}** price(s)${result.has_more ? ' (more available)' : ''}`
    };
  })
  .build();
