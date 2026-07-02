import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getHistory = SlateTool.create(spec, {
  name: 'Get Content History',
  key: 'get_history',
  description: `Retrieves the historical content values collected by a monitor over time.
Optionally returns diffs between consecutive values in Google diff format.
Supports date range filtering and pagination for large datasets.`,
  instructions: [
    'Use ISO 8601 format for date parameters.',
    'Set returnDiff to true to include diff output between consecutive values.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      wachetId: z.string().describe('ID of the monitor to get history for'),
      from: z.string().optional().describe('Start of date range filter (ISO 8601)'),
      to: z.string().optional().describe('End of date range filter (ISO 8601)'),
      count: z.number().optional().describe('Maximum number of history entries to return'),
      returnDiff: z.boolean().optional().describe('Include diff between consecutive values'),
      continuationToken: z
        .string()
        .optional()
        .describe('Pagination token from a previous response')
    })
  )
  .output(
    z.object({
      entries: z
        .array(
          z.object({
            lastCheckTimestamp: z.string().describe('When the page was last checked'),
            valueChangedTimestamp: z
              .string()
              .optional()
              .describe('When the value last changed'),
            raw: z.string().optional().describe('Raw captured content value'),
            error: z.string().optional().describe('Error message if the check failed'),
            diff: z
              .array(
                z.object({
                  operation: z
                    .number()
                    .optional()
                    .describe('Diff operation: 0=equal, -1=delete, 1=insert'),
                  text: z.string().optional().describe('Text segment for this diff operation')
                })
              )
              .optional()
              .describe('Diff between this value and the previous one (Google diff format)')
          })
        )
        .describe('Historical content entries'),
      continuationToken: z
        .string()
        .optional()
        .describe('Token to fetch the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.listDataHistory(ctx.input.wachetId, {
      from: ctx.input.from,
      to: ctx.input.to,
      count: ctx.input.count,
      returnDiff: ctx.input.returnDiff,
      continuationToken: ctx.input.continuationToken
    });

    let entries = (response.data ?? []).map(d => ({
      lastCheckTimestamp: d.lastCheckTimestamp,
      valueChangedTimestamp: d.valueChangedTimestamp,
      raw: d.raw,
      error: d.error,
      diff: d.diff?.map(de => ({
        operation: de.operation,
        text: de.text
      }))
    }));

    return {
      output: {
        entries,
        continuationToken: response.continuationToken
      },
      message: `Retrieved **${entries.length}** history entries for monitor \`${ctx.input.wachetId}\`.${response.continuationToken ? ' More results available.' : ''}`
    };
  })
  .build();
