import { SlateTool } from 'slates';
import { z } from 'zod';
import { CountdownClient } from '../lib/client';
import { spec } from '../spec';

let ebayDomainSchema = z
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
  .describe('eBay domain to search. Defaults to the domain configured in settings.');

export let searchProducts = SlateTool.create(spec, {
  name: 'Search eBay Products',
  key: 'search_products',
  description: `Search for products on any of 20 supported eBay domains worldwide. Supports filtering by condition, listing type, sort order, sold/completed items, and more. Returns structured search results including listing titles, prices, conditions, seller info, and images.`,
  instructions: [
    'Provide either a `searchTerm` or a `url` to an eBay search results page.',
    'Use `categoryId` to narrow results to a specific eBay category.',
    'Use `maxPage` to retrieve multiple pages in a single request (auto-pagination).'
  ],
  constraints: ['Results per page (`num`) must be 60, 120, or 240.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ebayDomain: ebayDomainSchema,
      searchTerm: z.string().optional().describe('Search term to search for eBay items.'),
      url: z
        .string()
        .optional()
        .describe(
          'Direct URL to an eBay search results page. Overrides searchTerm and ebayDomain.'
        ),
      categoryId: z.string().optional().describe('eBay category ID to filter search results.'),
      listingType: z
        .enum(['all', 'buy_it_now', 'auction', 'accepts_offers'])
        .optional()
        .describe('Type of listings to search for.'),
      sortBy: z
        .enum([
          'best_match',
          'price_high_to_low',
          'price_low_to_high',
          'price_high_to_low_plus_postage',
          'price_low_to_high_plus_postage',
          'newly_listed',
          'ending_soonest'
        ])
        .optional()
        .describe('Sort order for search results.'),
      condition: z
        .enum([
          'all',
          'new',
          'used',
          'open_box',
          'manufacturer_refurbished',
          'seller_refurbished',
          'parts_or_not_working',
          'not_specified'
        ])
        .optional()
        .describe('Filter by item condition.'),
      page: z.number().optional().describe('Page number to retrieve (starts at 1).'),
      maxPage: z
        .number()
        .optional()
        .describe(
          'Maximum page for auto-pagination. Retrieves pages 1 through maxPage in one request.'
        ),
      num: z.enum(['60', '120', '240']).optional().describe('Number of results per page.'),
      soldItems: z.boolean().optional().describe('Filter to sold items only.'),
      completedItems: z.boolean().optional().describe('Filter to completed items only.'),
      authorizedSellers: z.boolean().optional().describe('Filter to authorized sellers only.'),
      returnsAccepted: z
        .boolean()
        .optional()
        .describe('Filter to items with returns accepted.'),
      freeReturns: z.boolean().optional().describe('Filter to items with free returns.'),
      authenticityVerified: z
        .boolean()
        .optional()
        .describe('Filter to authenticity-verified items.'),
      dealsAndSavings: z.boolean().optional().describe('Filter to deals and savings items.'),
      saleItems: z.boolean().optional().describe('Filter to sale items only.'),
      facets: z
        .string()
        .optional()
        .describe('Search filter facets in comma-separated name=value notation.')
    })
  )
  .output(
    z.object({
      searchResults: z
        .array(z.any())
        .describe(
          'Array of search result items with title, price, condition, seller info, images, etc.'
        ),
      totalResults: z
        .number()
        .optional()
        .describe('Total number of results matching the search.'),
      currentPage: z.number().optional().describe('Current page number.'),
      totalPages: z.number().optional().describe('Total number of pages available.'),
      searchTerm: z.string().optional().describe('The search term used.'),
      ebayUrl: z.string().optional().describe('The eBay URL that was queried.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CountdownClient({ token: ctx.auth.token });
    let ebayDomain = ctx.input.ebayDomain || ctx.config.ebayDomain;

    let result = await client.search({
      ebayDomain,
      searchTerm: ctx.input.searchTerm,
      url: ctx.input.url,
      categoryId: ctx.input.categoryId,
      listingType: ctx.input.listingType,
      sortBy: ctx.input.sortBy,
      condition: ctx.input.condition,
      page: ctx.input.page,
      maxPage: ctx.input.maxPage,
      num: ctx.input.num ? Number(ctx.input.num) : undefined,
      soldItems: ctx.input.soldItems,
      completedItems: ctx.input.completedItems,
      authorizedSellers: ctx.input.authorizedSellers,
      returnsAccepted: ctx.input.returnsAccepted,
      freeReturns: ctx.input.freeReturns,
      authenticityVerified: ctx.input.authenticityVerified,
      dealsAndSavings: ctx.input.dealsAndSavings,
      saleItems: ctx.input.saleItems,
      facets: ctx.input.facets
    });

    let searchResults = result.search_results || [];
    let pagination = result.pagination || {};

    return {
      output: {
        searchResults,
        totalResults: pagination.total_results,
        currentPage: pagination.current_page,
        totalPages: pagination.total_pages,
        searchTerm: result.search_parameters?.search_term,
        ebayUrl: result.search_parameters?.ebay_url
      },
      message: `Found **${searchResults.length}** search results${ctx.input.searchTerm ? ` for "${ctx.input.searchTerm}"` : ''} on **${ebayDomain}**.${pagination.total_results ? ` Total: ${pagination.total_results} results across ${pagination.total_pages} pages.` : ''}`
    };
  })
  .build();
