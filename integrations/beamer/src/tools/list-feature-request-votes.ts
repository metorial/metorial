import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listFeatureRequestVotesTool = SlateTool.create(spec, {
  name: 'List Feature Request Votes',
  key: 'list_feature_request_votes',
  description:
    'List votes on a Beamer feature request, including vote IDs, voter details, dates, and dashboard URLs. Supports date filters and pagination.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      requestId: z
        .number()
        .describe('Feature request ID from list_feature_requests or create_feature_request'),
      dateFrom: z.string().optional().describe('Votes after this date (ISO-8601)'),
      dateTo: z.string().optional().describe('Votes before this date (ISO-8601)'),
      maxResults: z.number().optional().describe('Maximum votes per page, from 1 to 10'),
      page: z.number().optional().describe('Nonnegative whole-number page index')
    })
  )
  .output(
    z.object({
      votes: z.array(
        z.object({
          voteId: z.number(),
          date: z.string(),
          featureRequestTitle: z.string(),
          userId: z.string().nullable(),
          userEmail: z.string().nullable(),
          userFirstName: z.string().nullable(),
          userLastName: z.string().nullable(),
          url: z.string().nullable()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let { requestId, ...params } = ctx.input;
    let votes = await new Client({ token: ctx.auth.token }).listFeatureRequestVotes(
      requestId,
      params
    );
    let output = votes.map(vote => ({
      voteId: vote.id,
      date: vote.date,
      featureRequestTitle: vote.featureRequestTitle,
      userId: vote.userId,
      userEmail: vote.userEmail,
      userFirstName: vote.userFirstName,
      userLastName: vote.userLastName,
      url: vote.url
    }));
    return { output: { votes: output }, message: `Found **${output.length}** vote(s).` };
  })
  .build();
