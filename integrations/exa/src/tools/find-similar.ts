import { SlateTool } from 'slates';
import { z } from 'zod';
import { ExaClient } from '../lib/client';
import { spec } from '../spec';

export let findSimilarTool = SlateTool.create(spec, {
  name: 'Find Similar',
  key: 'find_similar',
  description: `Find web pages similar in meaning to a given URL. Useful for competitor analysis, discovering related content, or building recommendation systems.
Supports filtering by domains, dates, and text content. Optionally retrieve full text, highlights, and summaries.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('The URL to find similar pages for'),
      numResults: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of results (1-100, default: 10)'),
      includeDomains: z
        .array(z.string())
        .optional()
        .describe('Only include results from these domains'),
      excludeDomains: z
        .array(z.string())
        .optional()
        .describe('Exclude results from these domains'),
      startPublishedDate: z
        .string()
        .optional()
        .describe('Filter by publish date start (ISO 8601)'),
      endPublishedDate: z
        .string()
        .optional()
        .describe('Filter by publish date end (ISO 8601)'),
      startCrawlDate: z.string().optional().describe('Filter by crawl date start (ISO 8601)'),
      endCrawlDate: z.string().optional().describe('Filter by crawl date end (ISO 8601)'),
      includeText: z
        .array(z.string())
        .optional()
        .describe('Only include results containing these strings'),
      excludeText: z
        .array(z.string())
        .optional()
        .describe('Exclude results containing these strings'),
      contents: z
        .object({
          text: z
            .union([z.boolean(), z.object({ maxCharacters: z.number().optional() })])
            .optional(),
          highlights: z
            .union([
              z.boolean(),
              z.object({ maxCharacters: z.number().optional(), query: z.string().optional() })
            ])
            .optional(),
          summary: z.object({ query: z.string().optional() }).optional(),
          livecrawl: z.enum(['always', 'preferred', 'fallback', 'never']).optional()
        })
        .optional()
        .describe('Controls what content to retrieve for each result'),
      moderation: z.boolean().optional().describe('Filter unsafe content')
    })
  )
  .output(
    z.object({
      requestId: z.string().describe('Unique request identifier'),
      results: z
        .array(
          z.object({
            resultId: z.string().describe('Unique result identifier'),
            title: z.string().describe('Page title'),
            url: z.string().describe('Page URL'),
            publishedDate: z.string().optional().describe('Publication date'),
            author: z.string().optional().describe('Content author'),
            text: z.string().optional().describe('Full text content'),
            highlights: z.array(z.string()).optional().describe('Key excerpts'),
            summary: z.string().optional().describe('AI-generated summary')
          })
        )
        .describe('Similar pages found')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ExaClient(ctx.auth.token);

    let response = await client.findSimilar({
      url: ctx.input.url,
      numResults: ctx.input.numResults,
      includeDomains: ctx.input.includeDomains,
      excludeDomains: ctx.input.excludeDomains,
      startPublishedDate: ctx.input.startPublishedDate,
      endPublishedDate: ctx.input.endPublishedDate,
      startCrawlDate: ctx.input.startCrawlDate,
      endCrawlDate: ctx.input.endCrawlDate,
      includeText: ctx.input.includeText,
      excludeText: ctx.input.excludeText,
      contents: ctx.input.contents,
      moderation: ctx.input.moderation
    });

    let results = response.results.map(r => ({
      resultId: r.id,
      title: r.title,
      url: r.url,
      publishedDate: r.publishedDate,
      author: r.author,
      text: r.text,
      highlights: r.highlights,
      summary: r.summary
    }));

    return {
      output: {
        requestId: response.requestId,
        results
      },
      message: `Found **${results.length}** pages similar to ${ctx.input.url}.`
    };
  })
  .build();
