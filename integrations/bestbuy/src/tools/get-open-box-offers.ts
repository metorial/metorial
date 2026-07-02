import { SlateTool } from 'slates';
import { z } from 'zod';
import { BestBuyClient } from '../lib/client';
import { spec } from '../spec';

export let getOpenBoxOffers = SlateTool.create(spec, {
  name: 'Get Open Box Offers',
  key: 'get_open_box_offers',
  description: `Retrieve Open Box product deals from Best Buy with discounted pricing and condition ratings. Query by a single SKU, multiple SKUs (up to 100), or category ID. Only available products are returned. Each offer includes condition rating (excellent or certified) and discounted pricing.`,
  instructions: [
    'Provide either a single sku, a list of skus, or a categoryId.',
    'If sku is provided, it takes priority. If skus array is provided, it queries multiple SKUs at once.'
  ],
  constraints: [
    'Maximum 100 SKUs per multi-SKU query.',
    'Only currently available open box products are returned.',
    'Inventory is refreshed every five minutes.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      sku: z.string().optional().describe('Single product SKU to check for open box offers'),
      skus: z
        .array(z.string())
        .optional()
        .describe('Array of product SKUs (up to 100) to check for open box offers'),
      categoryId: z
        .string()
        .optional()
        .describe('Category ID to browse open box offers, e.g. "abcat0502000"')
    })
  )
  .output(
    z.object({
      count: z.number().describe('Number of products with open box offers'),
      openBoxProducts: z
        .array(
          z.object({
            sku: z.number().describe('Product SKU'),
            title: z.string().describe('Product title'),
            shortDescription: z.string().describe('Short product description'),
            newPrice: z.number().describe('Current new product price'),
            regularPrice: z.number().describe('Regular retail price'),
            imageUrl: z.string().describe('Standard product image URL'),
            productUrl: z.string().describe('URL to product page'),
            offers: z
              .array(
                z.object({
                  condition: z.string().describe('Product condition (excellent or certified)'),
                  currentPrice: z.number().describe('Current open box price'),
                  regularPrice: z.number().describe('Regular open box price')
                })
              )
              .describe('Available open box offers with condition and pricing')
          })
        )
        .describe('Array of products with open box offers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BestBuyClient({ token: ctx.auth.token });
    let { sku, skus, categoryId } = ctx.input;

    let result: any;

    if (sku) {
      result = await client.getOpenBoxBySku(sku);
    } else if (skus && skus.length > 0) {
      result = await client.getOpenBoxBySkus(skus);
    } else if (categoryId) {
      result = await client.getOpenBoxByCategory(categoryId);
    } else {
      throw new Error('Provide either sku, skus, or categoryId to query open box offers.');
    }

    let openBoxProducts = (result.results || []).map((item: any) => ({
      sku: item.sku,
      title: item.names?.title || '',
      shortDescription: item.descriptions?.short || '',
      newPrice: item.prices?.current || 0,
      regularPrice: item.prices?.regular || 0,
      imageUrl: item.images?.standard || '',
      productUrl: item.links?.web || '',
      offers: (item.offers || []).map((offer: any) => ({
        condition: offer.condition || '',
        currentPrice: offer.prices?.current || 0,
        regularPrice: offer.prices?.regular || 0
      }))
    }));

    return {
      output: {
        count: openBoxProducts.length,
        openBoxProducts
      },
      message: `Found **${openBoxProducts.length}** products with open box offers${sku ? ` for SKU ${sku}` : ''}${categoryId ? ` in category ${categoryId}` : ''}.`
    };
  })
  .build();
