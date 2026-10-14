import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let retryPost = SlateTool.create(spec, {
  key: 'retry_post',
  name: 'Retry Post',
  description:
    'Request a retry for a failed post. Ayrshare queues the retry and returns a pending status; check get_post_history_by_id for the final result.',
  instructions: [
    'Confirm the original error is retryable and the post has not already appeared on the social network before retrying.'
  ],
  constraints: ['The original post must have status error and can be retried only once.'],
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      postId: z.string().describe('Ayrshare Post ID of a failed post')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Retry request status, normally pending'),
      postId: z.string().describe('Ayrshare Post ID to check for the final publication status')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({
      ...ctx.auth,
      profileKey: ctx.config.profileKey
    }).retryPost(ctx.input.postId);
    return {
      output: { status: result.status, postId: result.id ?? ctx.input.postId },
      message: `Retry requested for post **${result.id ?? ctx.input.postId}**. Status: **${result.status}**.`
    };
  })
  .build();
