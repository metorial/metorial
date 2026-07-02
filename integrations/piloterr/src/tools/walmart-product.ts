import { SlateTool } from 'slates';
import { z } from 'zod';
import { PiloterrClient } from '../lib/client';
import { spec } from '../spec';

export let walmartProduct = SlateTool.create(spec, {
  name: 'Walmart Product',
  key: 'walmart_product',
  description: `Extract product data from a Walmart product page. Returns product name, brand, model, pricing, availability, images, description, and aggregate ratings.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      productUrl: z.string().describe('Full Walmart product URL')
    })
  )
  .output(
    z.object({
      sku: z.string().optional(),
      name: z.string().optional(),
      brand: z.string().optional(),
      model: z.string().optional(),
      image: z.string().optional(),
      gtin13: z.string().optional(),
      description: z.string().optional(),
      price: z.any().optional(),
      availability: z.string().optional(),
      currency: z.string().optional(),
      aggregateRating: z.any().optional(),
      raw: z.any().describe('Full raw response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PiloterrClient(ctx.auth.token);
    let result = await client.getWalmartProduct({ url: ctx.input.productUrl });

    let offers = result.offers ?? {};

    return {
      output: {
        sku: result.sku,
        name: result.name,
        brand: result.brand?.name,
        model: result.model,
        image: result.image,
        gtin13: result.gtin13,
        description: result.description,
        price: offers.price,
        availability: offers.availability,
        currency: offers.currency,
        aggregateRating: result.aggregate_rating,
        raw: result
      },
      message: `Retrieved Walmart product: **${result.name ?? 'Unknown'}**${offers.price ? ` — $${offers.price}` : ''}.`
    };
  })
  .build();
