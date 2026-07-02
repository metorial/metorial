import { SlateTool } from 'slates';
import { z } from 'zod';
import { CannyClient } from '../lib/client';
import { spec } from '../spec';

export let createVoteTool = SlateTool.create(spec, {
  name: 'Create Vote',
  key: 'create_vote',
  description: `Cast a vote on a feedback post on behalf of a user. Votes increase a post's score and indicate user demand.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      voterId: z.string().describe('Canny user ID of the voter'),
      postId: z.string().describe('Post ID to vote on'),
      createdByAdminId: z
        .string()
        .optional()
        .describe('Admin user ID if voting on behalf of someone')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the vote was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CannyClient(ctx.auth.token);
    await client.createVote({
      voterID: ctx.input.voterId,
      postID: ctx.input.postId,
      byID: ctx.input.createdByAdminId
    });

    return {
      output: { success: true },
      message: `Created vote on post **${ctx.input.postId}** by user **${ctx.input.voterId}**.`
    };
  })
  .build();
