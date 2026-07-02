import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateReview = SlateTool.create(spec, {
  name: 'Update Review',
  key: 'update_review',
  description: `Update an existing review in the directory. Only one review can be updated at a time.`,
  constraints: ['Only one review can be updated at a time.']
})
  .input(
    z.object({
      reviewId: z.string().describe('The review ID to update.'),
      reviewTitle: z.string().optional().describe('Updated title.'),
      reviewDescription: z.string().optional().describe('Updated content.'),
      ratingOverall: z.number().optional().describe('Updated overall rating (1-5).'),
      ratingService: z.number().optional().describe('Updated service rating (1-5).'),
      ratingResponse: z.number().optional().describe('Updated response rating (1-5).'),
      ratingExpertise: z.number().optional().describe('Updated expertise rating (1-5).'),
      ratingResults: z.number().optional().describe('Updated results rating (1-5).'),
      reviewImages: z.string().optional().describe('Updated comma-separated image URLs.'),
      additionalFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Any additional fields as key-value pairs.')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API.'),
      review: z.any().describe('The updated review record.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      websiteDomain: ctx.config.websiteDomain
    });

    let data: Record<string, any> = {
      review_id: ctx.input.reviewId
    };

    if (ctx.input.reviewTitle) data.review_title = ctx.input.reviewTitle;
    if (ctx.input.reviewDescription) data.review_description = ctx.input.reviewDescription;
    if (ctx.input.ratingOverall !== undefined) data.rating_overall = ctx.input.ratingOverall;
    if (ctx.input.ratingService !== undefined) data.rating_service = ctx.input.ratingService;
    if (ctx.input.ratingResponse !== undefined)
      data.rating_response = ctx.input.ratingResponse;
    if (ctx.input.ratingExpertise !== undefined)
      data.rating_expertise = ctx.input.ratingExpertise;
    if (ctx.input.ratingResults !== undefined) data.rating_results = ctx.input.ratingResults;
    if (ctx.input.reviewImages) data.review_images = ctx.input.reviewImages;
    if (ctx.input.additionalFields) {
      for (let [key, value] of Object.entries(ctx.input.additionalFields)) {
        data[key] = value;
      }
    }

    let result = await client.updateReview(data);

    return {
      output: {
        status: result.status,
        review: result.message
      },
      message: `Updated review **${ctx.input.reviewId}**.`
    };
  })
  .build();
