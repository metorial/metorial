import { SlateTool } from 'slates';
import { z } from 'zod';
import { GumroadClient } from '../lib/client';
import { gumroadActionScopes } from '../lib/scopes';
import { spec } from '../spec';

let reviewSchema = z.object({
  reviewId: z.string().describe('Unique review ID'),
  rating: z.number().optional().describe('Star rating from 1 to 5'),
  message: z
    .string()
    .optional()
    .describe('Review text written by the buyer. Absent when the buyer left a video instead.'),
  raterName: z
    .string()
    .optional()
    .describe('Reviewer display name or username, or "Anonymous"'),
  purchaseId: z.string().optional().describe('Sale ID of the reviewed purchase'),
  createdAt: z.string().optional().describe('Review submission timestamp'),
  response: z
    .object({
      message: z.string().optional().describe('Seller reply text'),
      createdAt: z.string().optional().describe('Seller reply timestamp')
    })
    .optional()
    .describe('Public seller reply, when one exists')
});

export let listProductReviews = SlateTool.create(spec, {
  name: 'List Product Reviews',
  key: 'list_product_reviews',
  description: `Retrieve the public reviews shown on one of your Gumroad product pages, newest first, including rating, review text, reviewer name, submission date, and any seller reply.`,
  instructions: [
    'Star-only ratings without a written message or approved video are not returned; they still count toward the product average rating.',
    'Use pageKey from a previous response to get the next page. Up to 100 reviews are returned per page.'
  ],
  tags: {
    readOnly: true
  }
})
  .scopes(gumroadActionScopes.read)
  .input(
    z.object({
      productId: z.string().describe('The product ID to list reviews for'),
      pageKey: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      reviews: z.array(reviewSchema).describe('Product reviews, newest first'),
      nextPageKey: z.string().optional().describe('Cursor for the next page of results'),
      nextPageUrl: z.string().optional().describe('URL for the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GumroadClient({ token: ctx.auth.token });
    let result = await client.listProductReviews(ctx.input.productId, {
      pageKey: ctx.input.pageKey
    });

    let reviews = result.reviews.map((review: any) => ({
      reviewId: review.id,
      rating: review.rating ?? undefined,
      message: review.message || undefined,
      raterName: review.rater_name || undefined,
      purchaseId: review.purchase_id || undefined,
      createdAt: review.created_at || undefined,
      response: review.response
        ? {
            message: review.response.message || undefined,
            createdAt: review.response.created_at || undefined
          }
        : undefined
    }));

    return {
      output: {
        reviews,
        nextPageKey: result.nextPageKey,
        nextPageUrl: result.nextPageUrl
      },
      message: `Found **${reviews.length}** review(s) for product ${ctx.input.productId}.${result.nextPageKey ? ' More results are available with pagination.' : ''}`
    };
  })
  .build();
