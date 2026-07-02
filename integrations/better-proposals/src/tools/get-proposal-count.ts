import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProposalCount = SlateTool.create(spec, {
  name: 'Get Proposal Count',
  key: 'get_proposal_count',
  description: `Retrieves the total number of proposals in the account. Useful for dashboards, reporting, or checking activity levels.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      status: z.string().describe('Response status from the API'),
      count: z.any().describe('Total proposal count data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getProposalCount();

    return {
      output: {
        status: result.status ?? 'success',
        count: result.data
      },
      message: `Retrieved proposal count.`
    };
  })
  .build();
