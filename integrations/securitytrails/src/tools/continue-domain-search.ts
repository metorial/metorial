import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let continueDomainSearch = SlateTool.create(spec, {
  name: 'Continue Domain Search',
  key: 'continue_domain_search',
  description: 'Retrieve the next batch of domain results from a scrolling DSL search.',
  instructions: [
    'First call search_domains with a DSL query and scroll set to true.',
    'Use the returned scrollId promptly; the provider says scroll identifiers expire after a few minutes.',
    'Stop requesting batches when no records remain. Use the latest scrollId when the response supplies one.'
  ],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      scrollId: z
        .string()
        .trim()
        .min(1)
        .describe('Scroll identifier returned by search_domains')
    })
  )
  .output(
    z
      .object({
        records: z.array(z.any()).describe('Domain records in this batch'),
        recordCount: z.number().optional().describe('Record count reported by the provider'),
        scrollId: z.string().optional().describe('Identifier to use for the next batch'),
        meta: z.any().optional().describe('Provider pagination metadata')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.scroll(ctx.input.scrollId);
    let records = result.records ?? [];
    return {
      output: {
        ...result,
        records,
        recordCount: result.record_count ?? undefined,
        scrollId: result.meta?.scroll_id ?? result.scroll_id ?? undefined,
        meta: result.meta ?? undefined
      },
      message: `Retrieved **${records.length}** domain records from the scrolling search.`
    };
  })
  .build();
