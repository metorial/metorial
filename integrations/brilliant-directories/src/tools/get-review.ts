import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getReview = SlateTool.create(spec, {
  name: 'Get Review',
  key: 'get_review',
  description: `Retrieve a review by its review ID or by querying a specific property.
Returns the review content, ratings, reviewer info, and associated member data.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      reviewId: z.string().optional().describe('The review ID to look up directly.'),
      property: z
        .string()
        .optional()
        .describe(
          'The column/field name to search by (e.g., "review_id", "user_id"). Used when reviewId is not provided.'
        ),
      propertyValue: z
        .string()
        .optional()
        .describe('The value to match for the given property.')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API.'),
      review: z.any().describe('The review record(s) returned.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      websiteDomain: ctx.config.websiteDomain
    });

    let result: any;
    if (ctx.input.reviewId) {
      result = await client.getReview(ctx.input.reviewId);
    } else if (ctx.input.property && ctx.input.propertyValue) {
      result = await client.getReviewByProperty(ctx.input.property, ctx.input.propertyValue);
    } else {
      throw new Error('Either reviewId or both property and propertyValue must be provided.');
    }

    return {
      output: {
        status: result.status,
        review: result.message
      },
      message: `Retrieved review data successfully.`
    };
  })
  .build();
