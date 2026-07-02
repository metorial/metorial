import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { RedditClient } from '../lib/client';
import { spec } from '../spec';

export let vote = SlateTool.create(spec, {
  name: 'Vote',
  key: 'vote',
  description: `Upvote, downvote, or remove your vote on a post or comment.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      thingId: z.string().describe('Fullname of the post (t3_*) or comment (t1_*) to vote on'),
      direction: z.enum(['upvote', 'downvote', 'unvote']).describe('Vote direction')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the vote was successful'),
      thingId: z.string().describe('Fullname of the voted item'),
      direction: z.string().describe('Vote direction applied')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedditClient(ctx.auth.token);

    let dirMap: Record<string, number> = {
      upvote: 1,
      downvote: -1,
      unvote: 0
    };

    await client.vote(ctx.input.thingId, dirMap[ctx.input.direction]!);

    return {
      output: {
        success: true,
        thingId: ctx.input.thingId,
        direction: ctx.input.direction
      },
      message: `Successfully ${ctx.input.direction === 'unvote' ? 'removed vote from' : `${ctx.input.direction}d`} \`${ctx.input.thingId}\`.`
    };
  })
  .build();
