import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let webSearch = SlateTool.create(spec, {
  name: 'Web Search',
  key: 'web_search',
  description: `Perform AI-optimized web searches using natural language objectives and optional keyword queries. Returns ranked results with excerpts and source URLs.
Supports three modes: **one-shot** for comprehensive results, **agentic** for concise token-efficient results in agentic loops, and **fast** for lower-latency results.
At least one of \`objective\` or \`searchQueries\` must be provided.`,
  instructions: [
    'Provide a clear natural language objective describing what you want to find.',
    'Use searchQueries for specific keyword-based searches alongside or instead of the objective.',
    'Use sourcePolicy to restrict results to specific domains or date ranges.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      objective: z
        .string()
        .optional()
        .describe(
          'Natural language description of what to find. May include guidance about preferred sources or freshness.'
        ),
      searchQueries: z
        .array(z.string())
        .optional()
        .describe('Keyword search query variations'),
      mode: z
        .enum(['one-shot', 'agentic', 'fast'])
        .optional()
        .describe(
          'Search mode: one-shot (comprehensive), agentic (concise for AI loops), fast (lower latency)'
        ),
      maxResults: z.number().optional().describe('Maximum number of results to return'),
      excerpts: z
        .object({
          maxCharsPerResult: z
            .number()
            .optional()
            .describe('Maximum characters per result excerpt (min 1000)'),
          maxCharsTotal: z
            .number()
            .optional()
            .describe('Maximum total characters across all excerpts (min 1000)')
        })
        .optional()
        .describe('Control excerpt length in results'),
      sourcePolicy: z
        .object({
          includeDomains: z
            .array(z.string())
            .optional()
            .describe('Only include results from these domains'),
          excludeDomains: z
            .array(z.string())
            .optional()
            .describe('Exclude results from these domains'),
          afterDate: z
            .string()
            .optional()
            .describe('Only include results published after this date (YYYY-MM-DD)')
        })
        .optional()
        .describe('Filter results by domain or date')
    })
  )
  .output(
    z.object({
      searchId: z.string().describe('Unique identifier for this search'),
      results: z
        .array(
          z.object({
            url: z.string().describe('URL of the result'),
            title: z.string().describe('Title of the result page'),
            publishDate: z
              .string()
              .nullable()
              .describe('Publication date (YYYY-MM-DD) or null'),
            excerpts: z.array(z.string()).describe('Relevant excerpts from the page')
          })
        )
        .describe('Search results ranked by relevance'),
      warnings: z.array(z.string()).nullable().describe('Any warnings from the search')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.search({
      objective: ctx.input.objective,
      searchQueries: ctx.input.searchQueries,
      mode: ctx.input.mode,
      maxResults: ctx.input.maxResults,
      excerpts: ctx.input.excerpts,
      sourcePolicy: ctx.input.sourcePolicy
    });

    let resultCount = result.results.length;
    return {
      output: result,
      message: `Found **${resultCount}** result${resultCount !== 1 ? 's' : ''}${ctx.input.objective ? ` for: "${ctx.input.objective}"` : ''}.`
    };
  })
  .build();
