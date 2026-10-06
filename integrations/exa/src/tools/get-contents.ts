import { SlateTool } from 'slates';
import { z } from 'zod';
import { ExaClient } from '../lib/client';
import { spec } from '../spec';

export let getContentsTool = SlateTool.create(spec, {
  name: 'Get Contents',
  key: 'get_contents',
  description: `Retrieve content from a list of URLs without performing a search. Extracts full text as markdown, key highlights, and AI-generated summaries from web pages.
Useful when you already have specific URLs and need to extract their content.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      urls: z
        .array(z.string())
        .min(1)
        .optional()
        .describe('URLs to extract; provide URLs or temporary document IDs'),
      ids: z
        .array(z.string())
        .min(1)
        .optional()
        .describe('Temporary document IDs from search; provide IDs or URLs'),
      maxAgeHours: z.number().optional().describe('Content freshness in hours (-1 to 720)'),
      text: z
        .union([
          z.boolean(),
          z.object({
            maxCharacters: z.number().optional().describe('Maximum characters to return'),
            includeHtmlTags: z.boolean().optional().describe('Include HTML tags')
          })
        ])
        .optional()
        .describe('Return full text content as markdown'),
      highlights: z
        .union([
          z.boolean(),
          z.object({
            maxCharacters: z.number().optional().describe('Maximum characters per highlight'),
            query: z.string().optional().describe('Custom query for highlight extraction')
          })
        ])
        .optional()
        .describe('Return key excerpts'),
      summary: z
        .object({
          query: z.string().optional().describe('Custom query to tailor the summary')
        })
        .optional()
        .describe('Return an AI-generated summary'),
      subpages: z.number().optional().describe('Number of subpages to crawl per URL'),
      livecrawlTimeout: z
        .number()
        .optional()
        .describe('Timeout for live crawling in milliseconds (default: 10000)')
    })
  )
  .output(
    z.object({
      requestId: z.string().describe('Unique request identifier'),
      costTotal: z.number().optional().describe('Reported cost in USD'),
      statuses: z
        .array(
          z.object({
            id: z.string(),
            status: z.string(),
            source: z.string().optional(),
            error: z
              .object({ tag: z.string(), httpStatusCode: z.number().nullish() })
              .nullish()
          })
        )
        .optional()
        .describe(
          'Per-document native retrieval status; a partial result is not success for every URL'
        ),
      results: z
        .array(
          z.object({
            title: z.string().optional().describe('Page title'),
            url: z.string().describe('Page URL'),
            publishedDate: z.string().optional().describe('Publication date'),
            author: z.string().optional().describe('Content author'),
            text: z.string().optional().describe('Full text content as markdown'),
            highlights: z.array(z.string()).optional().describe('Key excerpts'),
            summary: z.string().optional().describe('AI-generated summary')
          })
        )
        .describe('Extracted content for each URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ExaClient(ctx.auth.token, ctx.input);

    let response = await client.getContents({
      urls: ctx.input.urls,
      ids: ctx.input.ids,
      maxAgeHours: ctx.input.maxAgeHours,
      text: ctx.input.text,
      highlights: ctx.input.highlights,
      summary: ctx.input.summary,
      subpages: ctx.input.subpages,
      livecrawlTimeout: ctx.input.livecrawlTimeout
    });

    let results = response.results.map(r => ({
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
        statuses: response.statuses,
        costTotal: response.costDollars?.total,
        results
      },
      message: `Extracted content from **${results.length}** URL(s).`
    };
  })
  .build();
