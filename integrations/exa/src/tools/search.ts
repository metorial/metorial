import { SlateTool } from 'slates';
import { z } from 'zod';
import { ExaClient } from '../lib/client';
import { spec } from '../spec';

let contentOptionsSchema = z
  .object({
    text: z
      .union([
        z.boolean(),
        z.object({
          maxCharacters: z
            .number()
            .optional()
            .describe('Maximum number of characters to return'),
          includeHtmlTags: z
            .boolean()
            .optional()
            .describe('Whether to include HTML tags in the text')
        })
      ])
      .optional()
      .describe('Return the full text content of results as markdown'),
    highlights: z
      .union([
        z.boolean(),
        z.object({
          maxCharacters: z
            .number()
            .optional()
            .describe('Maximum number of characters per highlight'),
          query: z.string().optional().describe('Custom query for highlight extraction')
        })
      ])
      .optional()
      .describe('Return key excerpts most relevant to the query'),
    summary: z
      .object({
        query: z.string().optional().describe('Custom query to tailor the summary')
      })
      .optional()
      .describe('Return a concise AI-generated summary'),
    livecrawl: z
      .enum(['always', 'preferred', 'fallback', 'never'])
      .optional()
      .describe('Live crawl mode for fetching fresh content'),
    subpages: z.number().optional().describe('Number of subpages to crawl'),
    extras: z
      .object({
        links: z.number().optional().describe('Number of links to extract'),
        imageLinks: z.number().optional().describe('Number of image links to extract')
      })
      .optional()
      .describe('Additional data to extract')
  })
  .optional()
  .describe('Controls what content to retrieve for each result');

let searchResultSchema = z.object({
  resultId: z.string().describe('Unique result identifier'),
  title: z.string().describe('Page title'),
  url: z.string().describe('Page URL'),
  publishedDate: z.string().optional().describe('Publication date in ISO 8601 format'),
  author: z.string().optional().describe('Content author'),
  text: z.string().optional().describe('Full text content as markdown'),
  highlights: z.array(z.string()).optional().describe('Key excerpts from the content'),
  summary: z.string().optional().describe('AI-generated summary')
});

export let searchTool = SlateTool.create(spec, {
  name: 'Web Search',
  key: 'web_search',
  description: `Search the web using Exa's AI-native search engine. Supports neural search, auto mode, fast search, and deep search with query expansion.
Use **categories** to focus on specific content types like companies, people, news, tweets, or research papers.
Filter results by domains, dates, and text content. Optionally retrieve full text, highlights, and summaries inline.`,
  instructions: [
    'Use type "auto" (default) for general searches. Use "deep" for comprehensive research requiring query expansion.',
    'The "company" and "people" categories do not support date, text, or domain filters.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('The search query'),
      searchType: z
        .enum(['neural', 'auto', 'fast', 'deep'])
        .optional()
        .describe('Search method to use. Default: auto'),
      category: z
        .enum([
          'company',
          'research paper',
          'news',
          'tweet',
          'personal site',
          'financial report',
          'people'
        ])
        .optional()
        .describe('Focus on a specific content category'),
      numResults: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of results to return (1-100, default: 10)'),
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
        .describe('Filter results published after this ISO 8601 date'),
      endPublishedDate: z
        .string()
        .optional()
        .describe('Filter results published before this ISO 8601 date'),
      startCrawlDate: z
        .string()
        .optional()
        .describe('Filter results crawled after this ISO 8601 date'),
      endCrawlDate: z
        .string()
        .optional()
        .describe('Filter results crawled before this ISO 8601 date'),
      includeText: z
        .array(z.string())
        .optional()
        .describe('Only include results containing these text strings'),
      excludeText: z
        .array(z.string())
        .optional()
        .describe('Exclude results containing these text strings'),
      contents: contentOptionsSchema,
      moderation: z.boolean().optional().describe('Filter out unsafe content'),
      maxAgeHours: z.number().optional().describe('Maximum age of content in hours')
    })
  )
  .output(
    z.object({
      requestId: z.string().describe('Unique request identifier'),
      searchType: z.string().optional().describe('Search method that was used'),
      results: z.array(searchResultSchema).describe('Search results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ExaClient(ctx.auth.token);

    let response = await client.search({
      query: ctx.input.query,
      type: ctx.input.searchType,
      category: ctx.input.category,
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
      moderation: ctx.input.moderation,
      maxAgeHours: ctx.input.maxAgeHours
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
        searchType: response.searchType,
        results
      },
      message: `Found **${results.length}** results for "${ctx.input.query}"${ctx.input.searchType ? ` using ${ctx.input.searchType} search` : ''}.`
    };
  })
  .build();
