import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapYelpOutput } from '../lib/response';
import { spec } from '../spec';

let reviewSchema = z.object({
  reviewId: z.string().describe('Unique review ID'),
  url: z.string().optional().describe('URL to the full review on Yelp'),
  text: z.string().optional().describe('Review excerpt (~160 characters)'),
  rating: z.number().describe('Review rating (1-5)'),
  timeCreated: z.string().optional().describe('Review creation timestamp'),
  user: z
    .object({
      userId: z.string().optional().describe('User ID'),
      profileUrl: z.string().optional().describe('URL to user profile'),
      imageUrl: z.string().optional().describe('URL to user profile image'),
      name: z.string().optional().describe('User display name')
    })
    .optional()
    .describe('Review author information')
});

let outputSchema = z.object({
  rawResult: z
    .record(z.string(), z.unknown())
    .describe('Complete response returned by Yelp, including original nullable fields'),
  total: z
    .number()
    .describe(
      'Total number of review excerpts returned by Yelp, not the business lifetime review count'
    ),
  possibleLanguages: z.array(z.string()).optional().describe('Languages found in reviews'),
  reviews: z.array(reviewSchema).describe('List of review excerpts')
});

export let getReviews = SlateTool.create(spec, {
  name: 'Get Reviews',
  key: 'get_reviews',
  description: `Retrieve review excerpts for a specific Yelp business. Returns review excerpts (approximately 160 characters each) along with the reviewer's name, rating, and profile URL. Yelp documents up to three excerpts for this endpoint; access requires an Enhanced or Premium plan.`,
  constraints: [
    'Full review text is not available through this endpoint — only excerpts are returned.',
    'Requires an Enhanced or Premium plan with review endpoint access; available excerpts depend on the plan.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      businessIdOrAlias: z.string().describe('Yelp business ID or alias'),
      locale: z.string().optional().describe('Locale code (e.g., "en_US")'),
      sortBy: z.string().optional().describe('Sort order (default: "yelp_sort")'),
      limit: z.number().optional().describe('Number of reviews to return'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getBusinessReviews(ctx.input.businessIdOrAlias, {
      locale: ctx.input.locale,
      sortBy: ctx.input.sortBy,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    return mapYelpOutput(outputSchema, () => {
      let reviews = result.reviews.map((r: any) => ({
        reviewId: r.id,
        url: r.url,
        text: r.text,
        rating: r.rating,
        timeCreated: r.time_created,
        user: r.user
          ? {
              userId: r.user.id,
              profileUrl: r.user.profile_url,
              imageUrl: r.user.image_url ?? undefined,
              name: r.user.name
            }
          : undefined
      }));

      return {
        output: {
          rawResult: result,
          total: result.total,
          possibleLanguages: result.possible_languages,
          reviews
        },
        message: `Retrieved **${reviews.length}** review excerpts. Yelp reported **${result.total}** excerpts returned.`
      };
    });
  })
  .build();
