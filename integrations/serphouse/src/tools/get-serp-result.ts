import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSerpResult = SlateTool.create(spec, {
  name: 'Get SERP Task Result',
  key: 'get_serp_result',
  description: `Retrieve the results of a completed scheduled SERP search task by its unique ID. Returns structured JSON search results or a downloadable HTML file depending on the response type requested.`,
  instructions: [
    'Use "check_serp_task" first to verify the task is complete before retrieving results.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      taskId: z.string().describe('Unique identifier of the completed SERP task'),
      responseType: z.enum(['json', 'html']).default('json').describe('Response format')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status'),
      message: z.string().describe('Response message'),
      searchMetadata: z.any().optional().describe('Metadata about the search'),
      searchParameters: z.any().optional().describe('Search parameters used'),
      results: z.any().optional().describe('Structured SERP results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let response = await client.getSerpResult({
      taskId: ctx.input.taskId,
      responseType: ctx.input.responseType
    });

    let resultsData = response?.results;
    if (ctx.input.responseType === 'html') {
      await ctx.addAttachment({
        type: 'url',
        url: 'https://api.serphouse.com/serp/get/html',
        query: { id: ctx.input.taskId },
        headers: { Authorization: `Bearer ${ctx.auth.token}` },
        mimeType: 'text/html'
      });
    }

    return {
      output: {
        status: response?.status ?? (typeof response === 'string' ? 'success' : 'unknown'),
        message: response?.msg ?? '',
        searchMetadata: resultsData?.search_metadata,
        searchParameters: resultsData?.search_parameters,
        results:
          typeof response === 'string'
            ? response
            : typeof resultsData === 'string'
              ? resultsData
              : resultsData?.results
      },
      message: `Retrieved SERP results for task **${ctx.input.taskId}**.`
    };
  })
  .build();
