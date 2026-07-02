import { SlateTool } from 'slates';
import { z } from 'zod';
import { CannyClient } from '../lib/client';
import { spec } from '../spec';

export let deleteVoteTool = SlateTool.create(spec, {
  name: 'Delete Vote',
  key: 'delete_vote',
  description: `Remove a vote from a feedback post. This reduces the post's score.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      voteId: z.string().describe('The ID of the vote to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CannyClient(ctx.auth.token);
    await client.deleteVote(ctx.input.voteId);

    return {
      output: { success: true },
      message: `Deleted vote **${ctx.input.voteId}**.`
    };
  })
  .build();
