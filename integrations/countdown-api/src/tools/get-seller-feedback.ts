import { SlateTool } from 'slates';
import { z } from 'zod';
import { CountdownClient } from '../lib/client';
import { spec } from '../spec';

export let getSellerFeedback = SlateTool.create(spec, {
  name: 'Get Seller Feedback',
  key: 'get_seller_feedback',
  description: `Retrieve feedback left for an eBay seller. Look up by seller name or feedback page URL. Supports filtering by feedback type (buyer/seller/left for others), time period, and rating (positive/neutral/negative). Returns individual feedback entries with details.`,
  instructions: [
    'Provide either `sellerName` with `ebayDomain`, or a `url` to the seller feedback page.',
    'Use `feedbackType` to filter by `received_as_buyer`, `received_as_seller`, or `left_for_others`.',
    'The `searchTerm` filter requires `feedbackType` to be set to `received_as_seller`.'
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
      sellerName: z.string().optional().describe('The seller name to retrieve feedback for.'),
      url: z.string().optional().describe('Direct URL to the seller feedback page.'),
      feedbackType: z
        .enum(['all', 'received_as_buyer', 'received_as_seller', 'left_for_others'])
        .optional()
        .describe('Category of feedback to retrieve.'),
      searchTerm: z
        .string()
        .optional()
        .describe(
          'Search term to filter feedback. Requires feedbackType to be received_as_seller.'
        ),
      timePeriod: z
        .enum(['all', 'one_month', 'six_months', 'twelve_months'])
        .optional()
        .describe('Time period for feedback.'),
      overallRating: z
        .enum(['positive', 'neutral', 'negative'])
        .optional()
        .describe('Filter by overall rating.'),
      page: z.number().optional().describe('Page number to retrieve.'),
      maxPage: z.number().optional().describe('Maximum page for auto-pagination.'),
      num: z
        .enum(['25', '50', '100', '200'])
        .optional()
        .describe('Number of feedback entries per page.')
    })
  )
  .output(
    z.object({
      feedbackEntries: z.array(z.any()).describe('Array of feedback entries.'),
      feedbackSummary: z
        .any()
        .optional()
        .describe('Feedback summary with overall rating statistics.'),
      totalFeedback: z.number().optional().describe('Total number of feedback entries.'),
      currentPage: z.number().optional().describe('Current page number.'),
      totalPages: z.number().optional().describe('Total number of pages.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CountdownClient({ token: ctx.auth.token });
    let ebayDomain = ctx.input.ebayDomain || ctx.config.ebayDomain;

    let result = await client.getSellerFeedback({
      ebayDomain,
      sellerName: ctx.input.sellerName,
      url: ctx.input.url,
      feedbackType: ctx.input.feedbackType,
      searchTerm: ctx.input.searchTerm,
      timePeriod: ctx.input.timePeriod,
      overallRating: ctx.input.overallRating,
      page: ctx.input.page,
      maxPage: ctx.input.maxPage,
      num: ctx.input.num ? Number(ctx.input.num) : undefined
    });

    let feedbackEntries = result.seller_feedback || [];
    let summary = result.seller_feedback_summary || {};
    let pagination = result.pagination || {};

    return {
      output: {
        feedbackEntries,
        feedbackSummary: summary,
        totalFeedback: pagination.total_results,
        currentPage: pagination.current_page,
        totalPages: pagination.total_pages
      },
      message: `Retrieved **${feedbackEntries.length}** feedback entries for seller **${ctx.input.sellerName || 'unknown'}**.${pagination.total_results ? ` Total: ${pagination.total_results} entries.` : ''}`
    };
  })
  .build();
