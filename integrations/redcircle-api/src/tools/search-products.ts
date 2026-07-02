import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchProducts = SlateTool.create(spec, {
  name: 'Search Products',
  key: 'search_products',
  description: `Search Target's product inventory by keyword, UPC, SKU, or product name. Returns matching products with pricing, availability, ratings, and fulfillment options. Results can be sorted and filtered by brand, price, color, and other facets.`,
  instructions: [
    'Provide either a searchTerm or a Target search results URL.',
    'Use sortBy and filters to narrow results. Available facet IDs can be found in the facets array of a previous search response.'
  ],
  constraints: ['Maximum 2,000 requests per minute.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      searchTerm: z
        .string()
        .optional()
        .describe('Keywords to search for on Target (e.g. "highlighter pens").'),
      url: z
        .string()
        .optional()
        .describe('A Target search results page URL. Overrides searchTerm if provided.'),
      categoryId: z.string().optional().describe('Filter results by a Target category ID.'),
      sortBy: z
        .enum([
          'best_seller',
          'price_high_to_low',
          'price_low_to_high',
          'best_match',
          'highest_rating',
          'newly_listed',
          'featured'
        ])
        .optional()
        .describe('Sort order for search results.'),
      deliveryType: z
        .enum(['in_store_pickup', 'same_day_delivery', 'buy_at_store', 'ship_to_home'])
        .optional()
        .describe('Filter by delivery/fulfillment type.'),
      rating: z
        .enum(['one_star', 'two_star', 'three_star', 'four_star', 'five_star'])
        .optional()
        .describe('Filter by minimum star rating.'),
      includeOutOfStock: z
        .boolean()
        .optional()
        .describe('Include out-of-stock products in results. Defaults to false.'),
      facets: z
        .string()
        .optional()
        .describe('Comma-separated facet IDs for filtering (e.g. brand, price range).'),
      page: z.number().optional().describe('Page number to retrieve.'),
      maxPage: z
        .number()
        .optional()
        .describe('Auto-paginate up to this page number and concatenate results.'),
      customerZipcode: z
        .string()
        .optional()
        .describe('US zipcode to localize results. Overrides the global config zipcode.')
    })
  )
  .output(
    z.object({
      searchResults: z
        .array(z.any())
        .describe(
          'Array of product search results with position, product details, offers, and fulfillment info.'
        ),
      pagination: z
        .any()
        .optional()
        .describe('Pagination info including current page, total pages, and total results.'),
      relatedQueries: z
        .array(z.any())
        .optional()
        .describe('Related search queries suggested by Target.'),
      categories: z.array(z.any()).optional().describe('Category facets matching the search.'),
      facets: z.array(z.any()).optional().describe('Available facets for further filtering.'),
      requestInfo: z
        .any()
        .optional()
        .describe('Request metadata including credits used and remaining.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let params: Record<string, any> = {};
    if (ctx.input.searchTerm) params.search_term = ctx.input.searchTerm;
    if (ctx.input.url) params.url = ctx.input.url;
    if (ctx.input.categoryId) params.category_id = ctx.input.categoryId;
    if (ctx.input.sortBy) params.sort_by = ctx.input.sortBy;
    if (ctx.input.deliveryType) params.delivery_type = ctx.input.deliveryType;
    if (ctx.input.rating) params.rating = ctx.input.rating;
    if (ctx.input.includeOutOfStock !== undefined)
      params.include_out_of_stock = ctx.input.includeOutOfStock;
    if (ctx.input.facets) params.facets = ctx.input.facets;
    if (ctx.input.page) params.page = ctx.input.page;
    if (ctx.input.maxPage) params.max_page = ctx.input.maxPage;

    let zipcode = ctx.input.customerZipcode || ctx.config.customerZipcode;
    if (zipcode) params.customer_zipcode = zipcode;

    let data = await client.searchProducts(params);

    let resultCount = data.search_results?.length ?? 0;
    let totalResults = data.pagination?.total_results;

    return {
      output: {
        searchResults: data.search_results ?? [],
        pagination: data.pagination,
        relatedQueries: data.related_queries,
        categories: data.categories,
        facets: data.facets,
        requestInfo: data.request_info
      },
      message: `Found **${resultCount}** products${totalResults ? ` out of ${totalResults} total` : ''}${ctx.input.searchTerm ? ` for "${ctx.input.searchTerm}"` : ''}.`
    };
  })
  .build();
