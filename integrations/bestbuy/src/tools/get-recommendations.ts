import { SlateTool } from 'slates';
import { z } from 'zod';
import { BestBuyClient } from '../lib/client';
import { spec } from '../spec';

let recommendationTypeEnum = z.enum([
  'trending',
  'mostViewed',
  'alsoViewed',
  'alsoBought',
  'viewedUltimatelyBought'
]);

export let getRecommendations = SlateTool.create(spec, {
  name: 'Get Product Recommendations',
  key: 'get_recommendations',
  description: `Retrieve product recommendations from Best Buy based on customer behavior. Supports multiple recommendation types:
- **trending**: Top 10 trending products by viewing velocity
- **mostViewed**: Top 10 most frequently viewed products
- **alsoViewed**: Products commonly viewed alongside a specific product (requires SKU)
- **alsoBought**: Products commonly purchased together (requires SKU)
- **viewedUltimatelyBought**: Products bought after viewing a specific product (requires SKU)

Trending and mostViewed can be filtered by category. The other types require a specific product SKU.`,
  instructions: [
    'For trending and mostViewed, categoryId is optional. For alsoViewed, alsoBought, and viewedUltimatelyBought, sku is required.'
  ],
  constraints: [
    'Returns top 10 ranked products per request.',
    'Recommendations are based on aggregated customer behavior over the past 30 days.',
    'Response format is always JSON (XML not supported for recommendations).'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      recommendationType: recommendationTypeEnum.describe(
        'Type of recommendation to retrieve'
      ),
      sku: z
        .string()
        .optional()
        .describe('Product SKU (required for alsoViewed, alsoBought, viewedUltimatelyBought)'),
      categoryId: z
        .string()
        .optional()
        .describe(
          'Category ID to filter trending/mostViewed recommendations, e.g. "abcat0502000"'
        )
    })
  )
  .output(
    z.object({
      count: z.number().describe('Number of recommended products returned'),
      recommendations: z
        .array(
          z.object({
            sku: z.string().describe('Product SKU'),
            rank: z.number().describe('Recommendation rank position'),
            title: z.string().describe('Product title'),
            shortDescription: z.string().describe('Short product description'),
            currentPrice: z.number().describe('Current sale price'),
            regularPrice: z.number().describe('Regular price'),
            averageReviewScore: z.string().describe('Average customer review score'),
            reviewCount: z.number().describe('Number of customer reviews'),
            productUrl: z.string().describe('URL to product page on bestbuy.com'),
            imageUrl: z.string().describe('Standard product image URL'),
            addToCartUrl: z.string().describe('URL to add product to cart')
          })
        )
        .describe('Array of recommended products ranked by relevance')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BestBuyClient({ token: ctx.auth.token });
    let { recommendationType, sku, categoryId } = ctx.input;

    let result: any;

    switch (recommendationType) {
      case 'trending':
        result = await client.getTrendingProducts(categoryId);
        break;
      case 'mostViewed':
        result = await client.getMostViewedProducts(categoryId);
        break;
      case 'alsoViewed':
        if (!sku) throw new Error('SKU is required for alsoViewed recommendations');
        result = await client.getAlsoViewedProducts(sku);
        break;
      case 'alsoBought':
        if (!sku) throw new Error('SKU is required for alsoBought recommendations');
        result = await client.getAlsoBoughtProducts(sku);
        break;
      case 'viewedUltimatelyBought':
        if (!sku)
          throw new Error('SKU is required for viewedUltimatelyBought recommendations');
        result = await client.getViewedUltimatelyBought(sku);
        break;
    }

    let recommendations = (result.results || []).map((item: any) => ({
      sku: String(item.sku),
      rank: item.rank,
      title: item.names?.title || '',
      shortDescription: item.descriptions?.short || '',
      currentPrice: item.prices?.current || 0,
      regularPrice: item.prices?.regular || 0,
      averageReviewScore: item.customerReviews?.averageScore || '0',
      reviewCount: item.customerReviews?.count || 0,
      productUrl: item.links?.web || '',
      imageUrl: item.images?.standard || '',
      addToCartUrl: item.links?.addToCart || ''
    }));

    return {
      output: {
        count: recommendations.length,
        recommendations
      },
      message: `Retrieved **${recommendations.length}** ${recommendationType} recommendations${sku ? ` for SKU ${sku}` : ''}${categoryId ? ` in category ${categoryId}` : ''}.`
    };
  })
  .build();
