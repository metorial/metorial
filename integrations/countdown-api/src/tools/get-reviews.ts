import { SlateTool } from 'slates';
import { z } from 'zod';
import { CountdownClient } from '../lib/client';
import { spec } from '../spec';

export let getReviews = SlateTool.create(spec, {
  name: 'Get Product Reviews',
  key: 'get_reviews',
  description: `Retrieve customer reviews for an eBay product. Specify the product by EPID, GTIN/ISBN/UPC/EAN, or a direct eBay product URL. Returns review summaries, rating breakdowns, and individual reviews with title, body, rating, date, and reviewer info.`,
  instructions: [
    'Provide one of: `epid` with `ebayDomain`, a `gtin` code, or a `url` to an eBay product page.',
    'Use `sortBy` to order reviews (e.g., most_recent, rating_high_to_low).',
    'Use `searchTerm` to search within reviews.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ebayDomain: z
        .enum([
          'ebay.com',
          'ebay.co.uk',
          'ebay.com.au',
          'ebay.at',
          'ebay.be',
          'befr.ebay.be',
          'benl.ebay.be',
          'ebay.ca',
          'ebay.fr',
          'ebay.de',
          'ebay.com.hk',
          'ebay.ie',
          'ebay.it',
          'ebay.com.my',
          'ebay.nl',
          'ebay.ph',
          'ebay.pl',
          'ebay.com.sg',
          'ebay.es',
          'ebay.ch'
        ])
        .optional()
        .describe('eBay domain. Defaults to configured domain.'),
      epid: z.string().optional().describe('eBay Product ID to get reviews for.'),
      gtin: z.string().optional().describe('GTIN, ISBN, UPC, or EAN code to get reviews for.'),
      url: z
        .string()
        .optional()
        .describe('Direct URL to an eBay product page to get reviews from.'),
      skipGtinCache: z
        .boolean()
        .optional()
        .describe('Force a fresh GTIN-to-EPID lookup. Costs 2 credits.'),
      condition: z
        .enum(['all', 'new', 'refurbished', 'preowned'])
        .optional()
        .describe('Filter reviews by product condition.'),
      sortBy: z
        .enum(['most_relevant', 'most_recent', 'rating_high_to_low', 'rating_low_to_high'])
        .optional()
        .describe('Sort order for reviews.'),
      searchTerm: z.string().optional().describe('Search term to filter reviews.'),
      page: z.number().optional().describe('Page number to retrieve.'),
      maxPage: z.number().optional().describe('Maximum page for auto-pagination.')
    })
  )
  .output(
    z.object({
      reviews: z
        .array(z.any())
        .describe(
          'Array of individual reviews with title, body, rating, date, reviewer info.'
        ),
      ratingSummary: z
        .any()
        .optional()
        .describe('Rating summary including average rating and rating breakdown.'),
      totalReviews: z.number().optional().describe('Total number of reviews.'),
      currentPage: z.number().optional().describe('Current page number.'),
      totalPages: z.number().optional().describe('Total number of review pages.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CountdownClient({ token: ctx.auth.token });
    let ebayDomain = ctx.input.ebayDomain || ctx.config.ebayDomain;

    let result = await client.getReviews({
      ebayDomain,
      epid: ctx.input.epid,
      gtin: ctx.input.gtin,
      url: ctx.input.url,
      skipGtinCache: ctx.input.skipGtinCache,
      condition: ctx.input.condition,
      sortBy: ctx.input.sortBy,
      searchTerm: ctx.input.searchTerm,
      page: ctx.input.page,
      maxPage: ctx.input.maxPage
    });

    let reviews = result.reviews || [];
    let summary = result.rating_summary || result.reviews_summary || {};
    let pagination = result.pagination || {};

    return {
      output: {
        reviews,
        ratingSummary: summary,
        totalReviews: pagination.total_results || summary.reviews_total,
        currentPage: pagination.current_page,
        totalPages: pagination.total_pages
      },
      message: `Retrieved **${reviews.length}** reviews.${summary.rating ? ` Average rating: **${summary.rating}/5**` : ''}${pagination.total_results ? ` (${pagination.total_results} total)` : ''}.`
    };
  })
  .build();
