import { SlateTool } from 'slates';
import { z } from 'zod';
import { createSplunkClient } from '../lib/helpers';
import { spec } from '../spec';

export let runSearch = SlateTool.create(spec, {
  name: 'Run Search',
  key: 'run_search',
  description: `Execute an SPL (Search Processing Language) query against Splunk. Supports both **oneshot** (blocking, returns results immediately) and **async** (creates a search job, returns a job ID for later retrieval) execution modes.
Use oneshot mode for quick searches and async mode for long-running or complex queries.`,
  instructions: [
    'SPL queries should typically start with "search" command or a generating command like "| tstats", "| inputlookup", etc.',
    'Use earliestTime/latestTime to constrain time range (e.g. "-24h", "-7d@d", "2024-01-01T00:00:00").',
    'For async mode, use the Get Search Results tool to retrieve results after the job completes.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      searchQuery: z.string().describe('SPL search query to execute'),
      earliestTime: z
        .string()
        .optional()
        .describe(
          'Earliest time for the search range (e.g. "-24h", "-7d@d", "2024-01-01T00:00:00")'
        ),
      latestTime: z
        .string()
        .optional()
        .describe('Latest time for the search range (e.g. "now", "-1h")'),
      maxCount: z
        .number()
        .optional()
        .describe('Maximum number of results to return (default 10000)'),
      mode: z
        .enum(['oneshot', 'async'])
        .default('oneshot')
        .describe('Execution mode: oneshot returns results directly, async creates a job'),
      namespace: z
        .object({
          owner: z.string().optional().describe('Namespace owner (username)'),
          app: z.string().optional().describe('Namespace app context')
        })
        .optional()
        .describe('Optional app/owner namespace context')
    })
  )
  .output(
    z.object({
      searchId: z.string().optional().describe('Search job ID (only for async mode)'),
      results: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Search results (only for oneshot mode)'),
      resultCount: z.number().optional().describe('Number of results returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = createSplunkClient(ctx);

    if (ctx.input.mode === 'oneshot') {
      let response = await client.runOneshotSearch({
        search: ctx.input.searchQuery,
        earliestTime: ctx.input.earliestTime,
        latestTime: ctx.input.latestTime,
        maxCount: ctx.input.maxCount,
        namespace: ctx.input.namespace
      });

      return {
        output: {
          results: response.results,
          resultCount: response.results.length
        },
        message: `Oneshot search completed. Returned **${response.results.length}** results.`
      };
    } else {
      let response = await client.createSearchJob({
        search: ctx.input.searchQuery,
        earliestTime: ctx.input.earliestTime,
        latestTime: ctx.input.latestTime,
        maxCount: ctx.input.maxCount,
        execMode: 'normal',
        namespace: ctx.input.namespace
      });

      return {
        output: {
          searchId: response.searchId
        },
        message: `Search job created with ID **${response.searchId}**. Use the Get Search Results tool to retrieve results once the job completes.`
      };
    }
  })
  .build();
