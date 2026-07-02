import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteReview = SlateTool.create(spec, {
  name: 'Delete Review',
  key: 'delete_review',
  description: `Permanently delete a review from the directory.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      reviewId: z.string().describe('The review ID to delete.')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API.'),
      confirmation: z.string().describe('Confirmation message from the API.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      websiteDomain: ctx.config.websiteDomain
    });

    let result = await client.deleteReview(ctx.input.reviewId);

    return {
      output: {
        status: result.status,
        confirmation:
          typeof result.message === 'string' ? result.message : JSON.stringify(result.message)
      },
      message: `Deleted review **${ctx.input.reviewId}**.`
    };
  })
  .build();
