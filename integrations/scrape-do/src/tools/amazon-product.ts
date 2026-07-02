import { SlateTool } from 'slates';
import { z } from 'zod';
import { ScrapeDoClient } from '../lib/client';
import { spec } from '../spec';

export let amazonProduct = SlateTool.create(spec, {
  name: 'Amazon Product Details',
  key: 'amazon_product',
  description: `Retrieve structured product data from Amazon by ASIN. Returns JSON with product details including title, pricing, images, ratings, specifications, and more. Also supports fetching offer listings (all sellers) for a product. Covers 21 international Amazon marketplaces with ZIP code-based location targeting for local pricing.`,
  instructions: [
    'Use geocode to specify the Amazon marketplace (e.g., "us", "gb", "de", "jp").',
    'Use zipcode for location-specific pricing and availability.',
    'Set includeOffers to true to also retrieve all seller offers for the product.'
  ],
  constraints: ['The Amazon Scraper API has a concurrency limit of 1 request per token.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      asin: z.string().describe('Amazon Standard Identification Number (ASIN) of the product'),
      geocode: z
        .string()
        .describe(
          'Amazon marketplace country code (e.g., "us", "gb", "de", "fr", "jp", "ca", "au")'
        ),
      zipcode: z
        .string()
        .optional()
        .describe('Postal/ZIP code for location-specific pricing and availability'),
      language: z
        .string()
        .optional()
        .describe('Language code in ISO 639-1 uppercase format (e.g., "EN", "DE", "FR")'),
      includeHtml: z.boolean().optional().describe('Include raw HTML in the response'),
      includeOffers: z
        .boolean()
        .optional()
        .describe('Also fetch all seller offers for this product'),
      super: z
        .boolean()
        .optional()
        .describe('Enable residential proxies for higher success rates (costs 10x credits)')
    })
  )
  .output(
    z.object({
      product: z
        .any()
        .describe(
          'Structured product details from Amazon (title, price, images, ratings, specs, etc.)'
        ),
      offers: z
        .any()
        .optional()
        .describe('All seller offers for the product (if includeOffers was true)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ScrapeDoClient(ctx.auth.token);
    let input = ctx.input;

    let product = await client.amazonProductDetail({
      asin: input.asin,
      geocode: input.geocode,
      zipcode: input.zipcode,
      language: input.language,
      includeHtml: input.includeHtml,
      super: input.super
    });

    let offers: Record<string, unknown> | undefined;
    if (input.includeOffers) {
      offers = await client.amazonOfferListing({
        asin: input.asin,
        geocode: input.geocode,
        zipcode: input.zipcode,
        language: input.language,
        super: input.super
      });
    }

    let title = (product.title as string) || input.asin;

    return {
      output: {
        product,
        offers: offers || null
      },
      message: `Retrieved Amazon product **${title}** (ASIN: ${input.asin}) from **${input.geocode}** marketplace.${input.includeOffers ? ' Offers included.' : ''}`
    };
  })
  .build();
