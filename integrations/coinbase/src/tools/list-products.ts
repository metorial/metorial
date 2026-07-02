import { SlateTool } from 'slates';
import { z } from 'zod';
import { AdvancedTradeClient } from '../lib/advanced-trade-client';
import { coinbaseOAuthAuthMethods } from '../lib/auth-methods';
import { spec } from '../spec';

export let listProducts = SlateTool.create(spec, {
  name: 'List Products',
  key: 'list_products',
  description: `List available trading pairs (products) on the Advanced Trade platform, or get details for a specific product. Includes 24h volume, price, and trading status.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .authMethods(coinbaseOAuthAuthMethods)
  .input(
    z.object({
      productId: z
        .string()
        .optional()
        .describe(
          'Specific product ID to retrieve (e.g., "BTC-USD"). If omitted, lists all products.'
        ),
      limit: z.number().optional().describe('Max products to return (for list)'),
      offset: z.number().optional().describe('Offset for pagination'),
      productType: z.string().optional().describe('Filter by product type (e.g., "SPOT")')
    })
  )
  .output(
    z.object({
      product: z
        .object({
          productId: z.string(),
          baseCurrencyId: z.string().optional(),
          quoteCurrencyId: z.string().optional(),
          price: z.string().optional(),
          pricePercentageChange24h: z.string().optional(),
          volume24h: z.string().optional(),
          status: z.string().optional(),
          productType: z.string().optional(),
          baseName: z.string().optional(),
          quoteName: z.string().optional()
        })
        .optional()
        .describe('Single product details'),
      products: z
        .array(
          z.object({
            productId: z.string(),
            baseCurrencyId: z.string().optional(),
            quoteCurrencyId: z.string().optional(),
            price: z.string().optional(),
            pricePercentageChange24h: z.string().optional(),
            volume24h: z.string().optional(),
            status: z.string().optional(),
            productType: z.string().optional()
          })
        )
        .optional()
        .describe('List of products'),
      numProducts: z.number().optional().describe('Total number of products returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AdvancedTradeClient({ token: ctx.auth.token });

    if (ctx.input.productId) {
      let product = await client.getProduct(ctx.input.productId);
      return {
        output: {
          product: {
            productId: product.product_id,
            baseCurrencyId: product.base_currency_id,
            quoteCurrencyId: product.quote_currency_id,
            price: product.price,
            pricePercentageChange24h: product.price_percentage_change_24h,
            volume24h: product.volume_24h,
            status: product.status,
            productType: product.product_type,
            baseName: product.base_name,
            quoteName: product.quote_name
          }
        },
        message: `**${product.product_id}**: ${product.price} ${product.quote_currency_id} (${product.price_percentage_change_24h || '0'}% 24h)`
      };
    }

    let result = await client.listProducts({
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      productType: ctx.input.productType
    });

    let products = result.products || [];
    return {
      output: {
        products: products.map((p: any) => ({
          productId: p.product_id,
          baseCurrencyId: p.base_currency_id,
          quoteCurrencyId: p.quote_currency_id,
          price: p.price,
          pricePercentageChange24h: p.price_percentage_change_24h,
          volume24h: p.volume_24h,
          status: p.status,
          productType: p.product_type
        })),
        numProducts: result.num_products || products.length
      },
      message: `Found **${products.length}** product(s)`
    };
  })
  .build();
