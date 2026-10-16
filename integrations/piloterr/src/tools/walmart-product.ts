import { SlateTool } from 'slates';
import { z } from 'zod';
import { PiloterrClient } from '../lib/client';
import { normalizeOutput } from '../lib/response';
import { spec } from '../spec';

let walmartProductOutputSchema = z.object({
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
  averageRating: z.number().optional(),
  numberOfReviews: z.number().optional(),
  raw: z.any().describe('Full raw response')
});

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
  .output(walmartProductOutputSchema)
  .handleInvocation(async ctx => {
    let client = new PiloterrClient(ctx.auth.token);
    let result = await client.getWalmartProduct({ url: ctx.input.productUrl });

    let offers = result.offers ?? {};

    return {
      output: normalizeOutput(walmartProductOutputSchema, {
        sku: result.sku ?? result.us_item_id,
        name: result.name,
        brand: typeof result.brand === 'string' ? result.brand : result.brand?.name,
        model: result.model,
        image: result.image ?? result.image_info?.thumbnail_url,
        gtin13: result.gtin13,
        description:
          result.description ?? result.idml?.long_description ?? result.short_description,
        price: offers.price ?? result.price_info?.current_price?.price,
        availability: offers.availability ?? result.availability_status,
        currency: offers.currency ?? result.price_info?.current_price?.currency_unit,
        aggregateRating: result.aggregate_rating,
        averageRating: result.average_rating,
        numberOfReviews: result.number_of_reviews,
        raw: result
      }),
      message: `Retrieved Walmart product: **${result.name ?? 'Unknown'}**${offers.price ? ` — $${offers.price}` : ''}.`
    };
  })
  .build();
