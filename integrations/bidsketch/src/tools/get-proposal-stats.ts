import { SlateTool } from 'slates';
import { z } from 'zod';
import { BidsketchClient } from '../lib/client';
import { spec } from '../spec';

export let getProposalStats = SlateTool.create(spec, {
  name: 'Get Proposal Stats',
  key: 'get_proposal_stats',
  description: `Retrieve aggregate statistics about proposals across the Bidsketch account. Provides counts and totals useful for reporting and dashboards.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      stats: z.any().describe('Proposal statistics including counts and totals')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BidsketchClient(ctx.auth.token);
    let stats = await client.getProposalStats();

    return {
      output: { stats },
      message: `Retrieved proposal statistics.`
    };
  })
  .build();
