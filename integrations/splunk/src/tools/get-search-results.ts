import { SlateTool } from 'slates';
import { z } from 'zod';
import { createSplunkClient } from '../lib/helpers';
import { spec } from '../spec';

export let getSearchResults = SlateTool.create(spec, {
  name: 'Get Search Results',
  key: 'get_search_results',
  description: `Retrieve the status and results of a previously created search job. Returns the job's dispatch state and, if the search is complete, the result rows. Supports pagination with count and offset.`,
  instructions: [
    'First check if dispatchState is "DONE" before expecting results.',
    'If the job is still running, poll again after a short delay.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      searchId: z.string().describe('Search job ID returned from Run Search in async mode'),
      count: z.number().optional().describe('Number of results to return (default 100)'),
      offset: z.number().optional().describe('Offset for pagination (default 0)')
    })
  )
  .output(
    z.object({
      searchId: z.string().describe('The search job ID'),
      dispatchState: z
        .string()
        .optional()
        .describe('Current state: QUEUED, PARSING, RUNNING, FINALIZING, DONE, FAILED'),
      isDone: z.boolean().optional().describe('Whether the search has completed'),
      resultCount: z.number().optional().describe('Total result count from the job'),
      results: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Search result rows'),
      doneProgress: z.number().optional().describe('Completion progress (0.0 to 1.0)')
    })
  )
  .handleInvocation(async ctx => {
    let client = createSplunkClient(ctx);
    let status = await client.getSearchJobStatus(ctx.input.searchId);

    let results: Record<string, any>[] | undefined;
    if (status.isDone) {
      let resultData = await client.getSearchResults(ctx.input.searchId, {
        count: ctx.input.count,
        offset: ctx.input.offset
      });
      results = resultData.results;
    }

    return {
      output: {
        searchId: ctx.input.searchId,
        dispatchState: status.dispatchState,
        isDone: status.isDone,
        resultCount: status.resultCount,
        results,
        doneProgress: status.doneProgress
      },
      message: status.isDone
        ? `Search job **${ctx.input.searchId}** is complete. Returned **${results?.length ?? 0}** results.`
        : `Search job **${ctx.input.searchId}** is **${status.dispatchState}** (${Math.round((status.doneProgress || 0) * 100)}% done).`
    };
  })
  .build();
