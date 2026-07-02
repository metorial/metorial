import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let voteFeatureRequestTool = SlateTool.create(spec, {
  name: 'Vote on Feature Request',
  key: 'vote_feature_request',
  description: `Add a vote to a Beamer feature request. Optionally associate the vote with a user. Votes help determine priority of feature requests.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      requestId: z.number().describe('ID of the feature request to vote on'),
      userId: z.string().optional().describe('User ID of the voter'),
      userEmail: z.string().optional().describe('Email of the voter'),
      userFirstname: z.string().optional().describe('First name of the voter'),
      userLastname: z.string().optional().describe('Last name of the voter')
    })
  )
  .output(
    z.object({
      voted: z.boolean().describe('Whether the vote was recorded'),
      requestId: z.number().describe('ID of the feature request')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.createFeatureRequestVote(ctx.input.requestId, {
      userId: ctx.input.userId,
      userEmail: ctx.input.userEmail,
      userFirstname: ctx.input.userFirstname,
      userLastname: ctx.input.userLastname
    });

    return {
      output: {
        voted: true,
        requestId: ctx.input.requestId
      },
      message: `Voted on feature request **#${ctx.input.requestId}**.`
    };
  })
  .build();
