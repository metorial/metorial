import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let webSearch = SlateTool.create(spec, {
  name: 'Web Search',
  key: 'web_search',
  description: `Perform an AI-optimized web search that returns relevance-scored results with content snippets. Supports configurable search depth, topic categories (general, news, finance), time filtering, domain filtering, country boosting, and optional LLM-generated answers. Can also return images and full raw page content.`,
  instructions: [
    'Wrap phrases in quotes within the query to enforce exact matching when exactMatch is enabled.',
    'Use "advanced" searchDepth for detailed, high-precision queries (costs 2 credits instead of 1).',
    'The country parameter only works when topic is set to "general".',
    'startDate and endDate use YYYY-MM-DD format.'
  ],
  constraints: [
    'Maximum 20 results per search.',
    'Up to 300 include domains and 150 exclude domains.',
    'Chunks per source is only configurable with "advanced" or "fast" search depth (range 1-3).'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('The search query to execute'),
      searchDepth: z
        .enum(['ultra-fast', 'fast', 'basic', 'advanced'])
        .optional()
        .describe('Controls latency vs relevance tradeoff. Defaults to "basic"'),
      topic: z
        .enum(['general', 'news', 'finance'])
        .optional()
        .describe('Category to tailor result sources. Defaults to "general"'),
      maxResults: z
        .number()
        .min(0)
        .max(20)
        .optional()
        .describe('Maximum number of results to return (0-20). Defaults to 5'),
      chunksPerSource: z
        .number()
        .min(1)
        .max(3)
        .optional()
        .describe('Max content chunks per source (1-3). Only for advanced/fast depth'),
      timeRange: z
        .enum(['day', 'week', 'month', 'year'])
        .optional()
        .describe('Filter results by time range'),
      startDate: z.string().optional().describe('Filter results after this date (YYYY-MM-DD)'),
      endDate: z.string().optional().describe('Filter results before this date (YYYY-MM-DD)'),
      includeAnswer: z
        .union([z.boolean(), z.enum(['basic', 'advanced'])])
        .optional()
        .describe('Include an LLM-generated answer. Use "advanced" for higher quality'),
      includeRawContent: z
        .union([z.boolean(), z.enum(['markdown', 'text'])])
        .optional()
        .describe('Include full cleaned page content in markdown or text format'),
      includeImages: z.boolean().optional().describe('Include image results'),
      includeImageDescriptions: z
        .boolean()
        .optional()
        .describe('Add descriptions to image results'),
      includeDomains: z
        .array(z.string())
        .optional()
        .describe('Only include results from these domains'),
      excludeDomains: z
        .array(z.string())
        .optional()
        .describe('Exclude results from these domains'),
      country: z
        .string()
        .optional()
        .describe(
          'Two-letter country code to boost results from (only works with "general" topic)'
        ),
      autoParameters: z
        .boolean()
        .optional()
        .describe('Let Tavily auto-configure parameters based on query intent'),
      exactMatch: z
        .boolean()
        .optional()
        .describe('Only return results containing exact quoted phrases from the query')
    })
  )
  .output(
    z.object({
      query: z.string().describe('The executed search query'),
      answer: z.string().optional().describe('LLM-generated answer based on search results'),
      images: z
        .array(
          z.object({
            url: z.string().describe('Image URL'),
            description: z.string().optional().describe('Image description')
          })
        )
        .optional()
        .describe('Image search results'),
      results: z
        .array(
          z.object({
            title: z.string().describe('Result page title'),
            url: z.string().describe('Result page URL'),
            content: z.string().describe('Content snippet or summary'),
            score: z.number().describe('Relevance score'),
            rawContent: z.string().optional().describe('Full cleaned page content'),
            favicon: z.string().optional().describe('Favicon URL')
          })
        )
        .describe('Ranked search results'),
      autoParameters: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Auto-configured parameters used'),
      responseTime: z.number().describe('Time to complete the request in seconds')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      projectId: ctx.config.projectId
    });

    let result = await client.search({
      query: ctx.input.query,
      searchDepth: ctx.input.searchDepth,
      topic: ctx.input.topic,
      maxResults: ctx.input.maxResults,
      chunksPerSource: ctx.input.chunksPerSource,
      timeRange: ctx.input.timeRange,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      includeAnswer: ctx.input.includeAnswer,
      includeRawContent: ctx.input.includeRawContent,
      includeImages: ctx.input.includeImages,
      includeImageDescriptions: ctx.input.includeImageDescriptions,
      includeDomains: ctx.input.includeDomains,
      excludeDomains: ctx.input.excludeDomains,
      country: ctx.input.country,
      autoParameters: ctx.input.autoParameters,
      exactMatch: ctx.input.exactMatch
    });

    let resultCount = result.results.length;
    let hasAnswer = !!result.answer;
    let hasImages = !!result.images && result.images.length > 0;

    return {
      output: {
        query: result.query,
        answer: result.answer,
        images: result.images,
        results: result.results,
        autoParameters: result.autoParameters,
        responseTime: result.responseTime
      },
      message: `Search for **"${result.query}"** returned **${resultCount} result${resultCount !== 1 ? 's' : ''}**${hasAnswer ? ' with an AI-generated answer' : ''}${hasImages ? ` and ${result.images!.length} image(s)` : ''} in ${result.responseTime.toFixed(2)}s.`
    };
  })
  .build();
