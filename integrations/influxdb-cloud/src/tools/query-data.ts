import { SlateTool } from 'slates';
import { z } from 'zod';

import { createClient, orgIdInput } from '../lib/helpers';
import { spec } from '../spec';

export let queryData = SlateTool.create(spec, {
  name: 'Query Data',
  key: 'query_data',
  description: `Execute a **Flux** query against InfluxDB Cloud and return the results.
Flux is a functional scripting language that supports complex transformations, aggregations, joins, and custom functions.
Results are returned as CSV-formatted data.`,
  instructions: [
    'Call list_organizations to discover orgId when organization scope is needed.',
    'Provide a valid Flux query string. The query must include a from() clause with a bucket.',
    'Use range() to specify the time range for the query.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      orgId: orgIdInput,
      query: z.string().describe('Flux query string to execute'),
      params: z
        .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
        .optional()
        .describe('Flux runtime parameters referenced through params.name'),
      now: z.string().optional().describe('RFC3339 time used as now() during query execution')
    })
  )
  .output(
    z.object({
      csvResult: z.string().describe('Query results in CSV format')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.queryData({
      query: ctx.input.query,
      params: ctx.input.params,
      now: ctx.input.now
    });

    let csvResult = result;

    return {
      output: { csvResult },
      message: `Query executed successfully. Results returned in CSV format.`
    };
  })
  .build();
