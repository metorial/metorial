import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAppResults = SlateTool.create(spec, {
  name: 'Get App Results',
  key: 'get_app_results',
  description: `Retrieve the most recent result rows for a Promptmate.io app. Useful for fetching example outputs or reviewing the latest job results without specifying a particular job ID.`,
  constraints: ['Rate limited to 100 requests per minute.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      appId: z.string().describe('Unique identifier of the app to get results for'),
      onlyDefaultResultFields: z
        .boolean()
        .optional()
        .describe('If true, returns only the default result fields. Defaults to true.')
    })
  )
  .output(
    z.object({
      rows: z.array(z.record(z.string(), z.unknown())).describe('Array of recent result rows')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let rows = await client.getAppResults(ctx.input.appId, ctx.input.onlyDefaultResultFields);

    return {
      output: { rows },
      message: `Retrieved **${rows.length}** result row(s) for the app.`
    };
  })
  .build();
