import { SlateTool } from 'slates';
import { z } from 'zod';
import { CannyClient } from '../lib/client';
import { spec } from '../spec';

export let listVotesTool = SlateTool.create(spec, {
  name: 'List Votes',
  key: 'list_votes',
  description: `List votes on posts with optional filtering by board, post, user, or company. Returns voter details and timestamps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      boardId: z.string().optional().describe('Filter by board ID'),
      postId: z.string().optional().describe('Filter by post ID'),
      userId: z.string().optional().describe('Filter by voter user ID'),
      companyId: z.string().optional().describe('Filter by company ID'),
      limit: z.number().optional().describe('Number of votes to return (max 100)'),
      skip: z.number().optional().describe('Number of votes to skip for pagination')
    })
  )
  .output(
    z.object({
      votes: z
        .array(
          z.object({
            voteId: z.string().describe('Vote ID'),
            voterId: z.string().describe('ID of the voter'),
            voterName: z.string().describe('Name of the voter'),
            voterEmail: z.string().nullable().describe('Email of the voter'),
            postId: z.string().describe('Post ID'),
            created: z.string().describe('Vote timestamp')
          })
        )
        .describe('List of votes'),
      hasMore: z.boolean().describe('Whether more votes are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CannyClient(ctx.auth.token);
    let result = await client.listVotes({
      boardID: ctx.input.boardId,
      postID: ctx.input.postId,
      userID: ctx.input.userId,
      companyID: ctx.input.companyId,
      limit: ctx.input.limit,
      skip: ctx.input.skip
    });

    let votes = (result.votes || []).map((v: any) => ({
      voteId: v.id,
      voterId: v.voter?.id,
      voterName: v.voter?.name,
      voterEmail: v.voter?.email || null,
      postId: v.post?.id || v.postID,
      created: v.created
    }));

    return {
      output: { votes, hasMore: result.hasMore },
      message: `Found **${votes.length}** vote(s)${result.hasMore ? ' (more available)' : ''}.`
    };
  })
  .build();
