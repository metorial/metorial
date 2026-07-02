import { SlateTool } from 'slates';
import { z } from 'zod';
import { PiloterrClient } from '../lib/client';
import { spec } from '../spec';

export let amazonSearch = SlateTool.create(spec, {
  name: 'Amazon Product Search',
  key: 'amazon_search',
  description: `Search Amazon for products by keyword. Returns product listings with titles, prices, ratings, and review counts. Supports multiple Amazon regional domains.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Product search keywords'),
      amazonDomain: z
        .enum([
          'com',
          'fr',
          'de',
          'co.uk',
          'it',
          'es',
          'ca',
          'co.jp',
          'com.br',
          'com.mx',
          'in'
        ])
        .optional()
        .describe('Amazon regional domain (default: com)'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      products: z
        .array(
          z.object({
            asin: z.string().optional(),
            url: z.string().optional(),
            title: z.string().optional(),
            price: z.any().optional(),
            realPrice: z.any().optional(),
            rating: z.number().optional(),
            reviewsCount: z.number().optional()
          })
        )
        .describe('Search results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PiloterrClient(ctx.auth.token);
    let results = await client.searchAmazon({
      query: ctx.input.query,
      domain: ctx.input.amazonDomain,
      page: ctx.input.page
    });

    let products = (Array.isArray(results) ? results : []).map((p: any) => ({
      asin: p.asin,
      url: p.url,
      title: p.title,
      price: p.price,
      realPrice: p.real_price,
      rating: p.rating,
      reviewsCount: p.reviews_count
    }));

    return {
      output: { products },
      message: `Amazon search for **"${ctx.input.query}"** found **${products.length} products**.`
    };
  })
  .build();

export let amazonProduct = SlateTool.create(spec, {
  name: 'Amazon Product Details',
  key: 'amazon_product',
  description: `Retrieve detailed information about an Amazon product by its ASIN. Returns product title, price, description, features, images, variants, and seller information. Optionally also fetches third-party seller offers.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      asin: z.string().describe('Amazon Standard Identification Number (ASIN)'),
      amazonDomain: z
        .enum([
          'com',
          'fr',
          'de',
          'co.uk',
          'it',
          'es',
          'ca',
          'co.jp',
          'com.br',
          'com.mx',
          'in'
        ])
        .optional()
        .describe('Amazon regional domain (default: com)'),
      includeOffers: z.boolean().optional().describe('Also fetch third-party seller offers')
    })
  )
  .output(
    z.object({
      url: z.string().optional(),
      asin: z.string().optional(),
      title: z.string().optional(),
      price: z.any().optional(),
      stock: z.any().optional(),
      currency: z.string().optional(),
      description: z.string().optional(),
      features: z.array(z.string()).optional(),
      images: z.array(z.string()).optional(),
      productInformation: z.any().optional(),
      offers: z.array(z.any()).optional().describe('Third-party seller offers (if requested)'),
      raw: z.any().describe('Full raw response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PiloterrClient(ctx.auth.token);
    let result = await client.getAmazonProduct({
      asin: ctx.input.asin,
      domain: ctx.input.amazonDomain
    });

    let product = result.product ?? result;
    let offers: any[] | undefined;

    if (ctx.input.includeOffers) {
      let offersResult = await client.getAmazonOffers({
        asin: ctx.input.asin,
        domain: ctx.input.amazonDomain
      });
      offers = offersResult.results ?? offersResult;
    }

    return {
      output: {
        url: product.url,
        asin: product.asin,
        title: product.title,
        price: product.price,
        stock: product.stock,
        currency: product.currency,
        description: product.description,
        features: product.features,
        images: product.images,
        productInformation: product.product_information,
        offers,
        raw: result
      },
      message: `Retrieved Amazon product: **${product.title ?? ctx.input.asin}**${offers ? ` with **${offers.length} offers**` : ''}.`
    };
  })
  .build();
