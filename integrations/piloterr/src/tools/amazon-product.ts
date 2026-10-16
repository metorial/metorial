import { SlateTool } from 'slates';
import { z } from 'zod';
import { PiloterrClient } from '../lib/client';
import { normalizeOutput, responseArray } from '../lib/response';
import { spec } from '../spec';

let amazonSearchOutputSchema = z.object({
  raw: z.any().describe('Full provider response'),
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
});

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
  .output(amazonSearchOutputSchema)
  .handleInvocation(async ctx => {
    let client = new PiloterrClient(ctx.auth.token);
    let results = await client.searchAmazon({
      query: ctx.input.query,
      domain: ctx.input.amazonDomain,
      page: ctx.input.page
    });

    let products = responseArray(results, 'Amazon search').map((p: any) => ({
      asin: p.asin,
      url: p.url,
      title: p.title,
      price: p.price,
      realPrice: p.real_price,
      rating: p.rating,
      reviewsCount: p.reviews_count
    }));

    return {
      output: normalizeOutput(amazonSearchOutputSchema, { raw: results, products }),
      message: `Amazon search for **"${ctx.input.query}"** found **${products.length} products**.`
    };
  })
  .build();

let amazonProductOutputSchema = z.object({
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
  offersRaw: z.any().optional().describe('Complete seller-offer response when requested'),
  offers: z.array(z.any()).optional().describe('Third-party seller offers (if requested)'),
  raw: z.any().describe('Full raw response')
});

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
  .output(amazonProductOutputSchema)
  .handleInvocation(async ctx => {
    let client = new PiloterrClient(ctx.auth.token);
    let result = await client.getAmazonProduct({
      asin: ctx.input.asin,
      domain: ctx.input.amazonDomain
    });

    let product = result.product ?? result;
    let offers: any[] | undefined;
    let offersRaw: any;

    if (ctx.input.includeOffers) {
      let offersResult = await client.getAmazonOffers({
        asin: ctx.input.asin,
        domain: ctx.input.amazonDomain
      });
      offersRaw = offersResult;
      offers = responseArray(offersResult.results, 'Amazon offers');
    }

    return {
      output: normalizeOutput(amazonProductOutputSchema, {
        url: product.url,
        asin: product.asin,
        title: product.title,
        price: product.price,
        stock: product.stock,
        currency: product.currency,
        description: product.description,
        features: product.features,
        images: Array.isArray(product.images)
          ? product.images
              .map((image: any) => (typeof image === 'string' ? image : image?.url))
              .filter((url: unknown) => typeof url === 'string')
          : undefined,
        productInformation: product.product_information,
        offers,
        offersRaw,
        raw: result
      }),
      message: `Retrieved Amazon product: **${product.title ?? ctx.input.asin}**${offers ? ` with **${offers.length} offers**` : ''}.`
    };
  })
  .build();
