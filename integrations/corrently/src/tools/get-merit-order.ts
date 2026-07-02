import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getMeritOrder = SlateTool.create(spec, {
  name: 'Merit Order List',
  key: 'get_merit_order',
  description: `Retrieves the current merit order list for the German electricity market. Shows power plants ordered by their marginal cost of production, which determines the wholesale electricity price. Useful for understanding market dynamics and price formation.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      entries: z
        .array(z.record(z.string(), z.any()))
        .describe('Merit order list entries sorted by marginal cost')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getMeritOrder();

    return {
      output: {
        entries: result.data || []
      },
      message: `Retrieved the German electricity market merit order list with **${(result.data || []).length}** entries.`
    };
  })
  .build();
