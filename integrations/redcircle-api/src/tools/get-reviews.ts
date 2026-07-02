import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getReviews = SlateTool.create(spec, {
  name: 'Get Reviews',
  key: 'get_reviews',
  description: `Retrieve customer reviews for a Target product. Returns individual reviews with ratings, text, author info, and verification status, plus a summary with overall rating, rating breakdown, and recommended percentage. Look up by TCIN, DPCI, GTIN/UPC/ISBN, or URL.`,
  instructions: ['Provide exactly one identifier: tcin, dpci, gtin, or url.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tcin: z.string().optional().describe('Target TCIN (item ID).'),
      dpci: z.string().optional().describe('Target DPCI code.'),
      gtin: z.string().optional().describe('GTIN, UPC, or ISBN.'),
      url: z
        .string()
        .optional()
        .describe('Target product page URL. Overrides other identifiers.'),
      reviewerType: z
        .enum(['verified_purchase', 'all'])
        .optional()
        .describe('Filter by reviewer type.'),
      reviewStars: z
        .enum(['all_stars', 'five_star', 'four_star', 'three_star', 'two_star', 'one_star'])
        .optional()
        .describe('Filter by star rating.'),
      reviewMediaType: z
        .enum(['all_reviews', 'media_reviews_only'])
        .optional()
        .describe('Filter to only reviews with media.'),
      sortBy: z
        .enum(['most_recent', 'high_to_low_rating', 'low_to_high_rating', 'most_helpful'])
        .optional()
        .describe('Sort order for reviews.'),
      page: z.number().optional().describe('Page number.'),
      maxPage: z
        .number()
        .optional()
        .describe('Auto-paginate up to this page and concatenate results.')
    })
  )
  .output(
    z.object({
      reviews: z
        .array(z.any())
        .describe(
          'Array of customer reviews with rating, title, body, date, author, and feedback counts.'
        ),
      summary: z
        .any()
        .optional()
        .describe(
          'Review summary including overall rating, total ratings, rating breakdown, and recommended percentage.'
        ),
      pagination: z.any().optional().describe('Pagination info.'),
      requestInfo: z.any().optional().describe('Request metadata including credits used.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let params: Record<string, any> = {};
    if (ctx.input.tcin) params.tcin = ctx.input.tcin;
    if (ctx.input.dpci) params.dpci = ctx.input.dpci;
    if (ctx.input.gtin) params.gtin = ctx.input.gtin;
    if (ctx.input.url) params.url = ctx.input.url;
    if (ctx.input.reviewerType) params.reviewer_type = ctx.input.reviewerType;
    if (ctx.input.reviewStars) params.review_stars = ctx.input.reviewStars;
    if (ctx.input.reviewMediaType) params.review_media_type = ctx.input.reviewMediaType;
    if (ctx.input.sortBy) params.sort_by = ctx.input.sortBy;
    if (ctx.input.page) params.page = ctx.input.page;
    if (ctx.input.maxPage) params.max_page = ctx.input.maxPage;

    let data = await client.getReviews(params);

    let reviewCount = data.reviews?.length ?? 0;
    let overallRating = data.summary?.rating;

    return {
      output: {
        reviews: data.reviews ?? [],
        summary: data.summary,
        pagination: data.pagination,
        requestInfo: data.request_info
      },
      message: `Retrieved **${reviewCount}** reviews${overallRating ? ` (overall rating: ${overallRating}/5)` : ''}.`
    };
  })
  .build();
