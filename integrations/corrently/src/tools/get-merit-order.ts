import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getMeritOrder = SlateTool.create(spec, {
  name: 'Merit Order List',
  key: 'get_merit_order',
  description: `Retrieves German electricity merit-order analysis grouped into price buckets, including generation capacity utilization and actual generation by source.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      raw: z.unknown().describe('Complete provider response'),
      entries: z
        .array(z.record(z.string(), z.any()))
        .describe('Merit-order analysis price buckets')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getMeritOrder();

    let entries = Array.isArray(result) ? result : (result.data ?? []);

    return {
      output: { raw: result, entries },
      message: `Retrieved the German electricity market merit order list with **${entries.length}** entries.`
    };
  })
  .build();
