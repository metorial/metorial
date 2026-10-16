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
      appId: z.string().describe('App ID. Call list_apps to discover available apps.'),
      onlyDefaultResultFields: z
        .boolean()
        .optional()
        .describe('Request only default result fields; omit to use provider behavior.')
    })
  )
  .output(
    z.object({
      rows: z.array(z.record(z.string(), z.unknown())).describe('Array of recent result rows'),
      appId: z.string().optional().describe('App ID returned by the provider'),
      responseFields: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Result field definitions'),
      raw: z.unknown().optional().describe('Complete app results response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getAppResults(
      ctx.input.appId,
      ctx.input.onlyDefaultResultFields
    );

    return {
      output: result,
      message: `Retrieved **${result.rows.length}** result row(s) for the app.`
    };
  })
  .build();
