import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProposal = SlateTool.create(spec, {
  name: 'Get Proposal',
  key: 'get_proposal',
  description: `Retrieves detailed information about a specific proposal by its ID. Also supports fetching the total proposal count across the account.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      proposalId: z.string().describe('The unique ID of the proposal to retrieve')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API'),
      proposal: z.any().describe('Full proposal details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getProposal(ctx.input.proposalId);

    return {
      output: {
        status: result.status ?? 'success',
        proposal: result.data
      },
      message: `Retrieved proposal **${ctx.input.proposalId}**.`
    };
  })
  .build();
