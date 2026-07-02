import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let matchLead = SlateTool.create(spec, {
  name: 'Match Lead',
  key: 'match_lead',
  description: `Match a lead to one or more members by batching member IDs or email addresses.
Returns the results of each match attempt including successes and failures.`
})
  .input(
    z.object({
      leadId: z.string().describe('The lead ID to match members to.'),
      usersToMatch: z
        .string()
        .describe(
          'Comma-separated list of member IDs or email addresses to match with the lead.'
        )
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API.'),
      matchResults: z.any().describe('Results showing successful and failed matches.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      websiteDomain: ctx.config.websiteDomain
    });

    let result = await client.matchLead(ctx.input.leadId, ctx.input.usersToMatch);

    return {
      output: {
        status: result.status,
        matchResults: result.message
      },
      message: `Matched lead **${ctx.input.leadId}** with specified members.`
    };
  })
  .build();
