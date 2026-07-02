import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createReview = SlateTool.create(spec, {
  name: 'Create Review',
  key: 'create_review',
  description: `Create a new review for a member in the directory. Supports overall and specific ratings, images, and email notifications.`
})
  .input(
    z.object({
      userId: z.string().describe('The member ID who is being reviewed.'),
      reviewTitle: z.string().describe('Title/headline of the review.'),
      reviewDescription: z.string().describe('The review content/body.'),
      reviewEmail: z.string().describe('Email address of the reviewer.'),
      reviewName: z.string().describe('Name of the reviewer.'),
      ratingOverall: z.number().optional().describe('Overall rating (1-5).'),
      ratingService: z.number().optional().describe('Service rating (1-5).'),
      ratingResponse: z.number().optional().describe('Response rating (1-5).'),
      ratingExpertise: z.number().optional().describe('Expertise rating (1-5).'),
      ratingResults: z.number().optional().describe('Results rating (1-5).'),
      reviewImages: z.string().optional().describe('Comma-separated image URLs.'),
      sendReviewEmail: z
        .boolean()
        .optional()
        .describe('Whether to send a notification email to the reviewed member.'),
      autoImportReviewImage: z
        .boolean()
        .optional()
        .describe('Whether to import images automatically.')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API.'),
      review: z.any().describe('The newly created review record.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      websiteDomain: ctx.config.websiteDomain
    });

    let data: Record<string, any> = {
      user_id: ctx.input.userId,
      review_title: ctx.input.reviewTitle,
      review_description: ctx.input.reviewDescription,
      review_email: ctx.input.reviewEmail,
      review_name: ctx.input.reviewName
    };

    if (ctx.input.ratingOverall !== undefined) data.rating_overall = ctx.input.ratingOverall;
    if (ctx.input.ratingService !== undefined) data.rating_service = ctx.input.ratingService;
    if (ctx.input.ratingResponse !== undefined)
      data.rating_response = ctx.input.ratingResponse;
    if (ctx.input.ratingExpertise !== undefined)
      data.rating_expertise = ctx.input.ratingExpertise;
    if (ctx.input.ratingResults !== undefined) data.rating_results = ctx.input.ratingResults;
    if (ctx.input.reviewImages) data.review_images = ctx.input.reviewImages;
    if (ctx.input.sendReviewEmail !== undefined)
      data.send_review_email = ctx.input.sendReviewEmail ? '1' : '0';
    if (ctx.input.autoImportReviewImage !== undefined)
      data.auto_import_review_image = ctx.input.autoImportReviewImage ? '1' : '0';

    let result = await client.createReview(data);

    return {
      output: {
        status: result.status,
        review: result.message
      },
      message: `Created review **"${ctx.input.reviewTitle}"** for member ${ctx.input.userId}.`
    };
  })
  .build();
