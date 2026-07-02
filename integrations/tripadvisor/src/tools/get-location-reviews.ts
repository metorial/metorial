import { SlateTool } from 'slates';
import { z } from 'zod';
import { ContentClient } from '../lib/client';
import { spec } from '../spec';

let reviewUserSchema = z
  .object({
    username: z.string().optional(),
    userLocation: z.string().optional(),
    reviewCount: z.number().optional(),
    reviewerBadge: z.string().optional()
  })
  .optional();

let ownerResponseSchema = z
  .object({
    title: z.string().optional(),
    text: z.string().optional(),
    author: z.string().optional(),
    publishedDate: z.string().optional()
  })
  .optional();

let reviewSchema = z.object({
  reviewId: z.string(),
  locationId: z.string(),
  title: z.string().optional(),
  text: z.string().optional(),
  rating: z.number().optional(),
  ratingImageUrl: z.string().optional(),
  publishedDate: z.string().optional(),
  travelDate: z.string().optional(),
  tripType: z.string().optional(),
  helpfulVotes: z.number().optional(),
  url: z.string().optional(),
  language: z.string().optional(),
  isMachineTranslated: z.boolean().optional(),
  user: reviewUserSchema,
  ownerResponse: ownerResponseSchema
});

export let getLocationReviews = SlateTool.create(spec, {
  name: 'Get Location Reviews',
  key: 'get_location_reviews',
  description: `Retrieve the most recent reviews for a specific Tripadvisor location. Returns review text, rating, trip type, travel date, user info, and any owner responses. Use a location ID obtained from the search tools.`,
  constraints: ['Returns up to 5 reviews per location.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      locationId: z.string().describe('Tripadvisor location ID'),
      language: z
        .string()
        .optional()
        .describe('Language code for results (overrides global config)'),
      limit: z.number().optional().describe('Number of reviews to return (max 5)'),
      offset: z.number().optional().describe('Index of the first result for pagination')
    })
  )
  .output(
    z.object({
      reviews: z.array(reviewSchema),
      totalResults: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ContentClient({
      token: ctx.auth.token,
      language: ctx.config.language,
      currency: ctx.config.currency
    });

    let result = await client.getLocationReviews(
      ctx.input.locationId,
      ctx.input.language,
      ctx.input.limit,
      ctx.input.offset
    );

    let reviews = (result.data || []).map((r: any) => ({
      reviewId: String(r.id),
      locationId: String(r.location_id),
      title: r.title,
      text: r.text,
      rating: r.rating,
      ratingImageUrl: r.rating_image_url,
      publishedDate: r.published_date,
      travelDate: r.travel_date,
      tripType: r.trip_type,
      helpfulVotes: r.helpful_votes,
      url: r.url,
      language: r.lang,
      isMachineTranslated: r.is_machine_translated,
      user: r.user
        ? {
            username: r.user.username,
            userLocation: r.user.user_location?.name,
            reviewCount: r.user.review_count,
            reviewerBadge: r.user.reviewer_badge
          }
        : undefined,
      ownerResponse: r.owner_response
        ? {
            title: r.owner_response.title,
            text: r.owner_response.text,
            author: r.owner_response.author,
            publishedDate: r.owner_response.published_date
          }
        : undefined
    }));

    let totalResults = result.paging?.total_results;

    return {
      output: { reviews, totalResults },
      message: `Retrieved **${reviews.length}** review(s) for location ${ctx.input.locationId}${totalResults ? ` (${totalResults} total)` : ''}.`
    };
  })
  .build();
