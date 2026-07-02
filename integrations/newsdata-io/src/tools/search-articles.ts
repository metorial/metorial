import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let languageEnum = z
  .enum(['ar', 'de', 'en', 'es', 'fr', 'he', 'it', 'nl', 'no', 'pt', 'ru', 'sv', 'ud', 'zh'])
  .describe('2-letter ISO-639-1 language code');

let sortByEnum = z
  .enum(['relevancy', 'popularity', 'publishedAt'])
  .describe(
    'Sort order: relevancy (default for keyword searches), popularity, or publishedAt (newest first)'
  );

let articleSchema = z.object({
  sourceId: z.string().nullable().describe('Identifier of the news source'),
  sourceName: z.string().describe('Display name of the news source'),
  author: z.string().nullable().describe('Author of the article'),
  title: z.string().describe('Headline or title of the article'),
  description: z.string().nullable().describe('Short description or snippet of the article'),
  url: z.string().describe('Direct URL to the full article'),
  imageUrl: z.string().nullable().describe('URL to a relevant image for the article'),
  publishedAt: z.string().describe('Date and time the article was published (ISO 8601)'),
  content: z.string().nullable().describe('First 200 characters of the article content')
});

export let searchArticles = SlateTool.create(spec, {
  name: 'Search Articles',
  key: 'search_articles',
  description: `Search through millions of news articles from over 150,000 sources worldwide. Supports advanced keyword queries with exact match (quotes), required/excluded terms (+/-), and boolean operators (AND/OR/NOT). Results can be filtered by source, domain, date range, and language, and sorted by relevancy, popularity, or publish date. Article content is truncated to 200 characters; use the article URL to access the full text.`,
  instructions: [
    'Use quotes around phrases for exact match, e.g. "climate change".',
    'Prefix terms with + to require them or - to exclude them.',
    'Use AND/OR/NOT for boolean logic, with optional parentheses for grouping.',
    'Specify searchIn to restrict keyword matching to title, description, or content fields.',
    'Maximum of 20 sources can be specified at once.'
  ],
  constraints: [
    'Article content is truncated to 200 characters.',
    'Maximum 100 results per page.',
    'Articles are available from the last 5 years.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe(
          'Keywords or phrases to search for in articles. Supports advanced syntax: exact match with quotes, +/- for required/excluded terms, AND/OR/NOT operators.'
        ),
      searchIn: z
        .string()
        .optional()
        .describe(
          'Comma-separated list of fields to restrict keyword search to. Options: title, description, content.'
        ),
      sources: z
        .string()
        .optional()
        .describe('Comma-separated list of source identifiers to filter by (max 20).'),
      domains: z
        .string()
        .optional()
        .describe(
          'Comma-separated list of domains to include, e.g. "bbc.co.uk,techcrunch.com".'
        ),
      excludeDomains: z
        .string()
        .optional()
        .describe('Comma-separated list of domains to exclude from results.'),
      fromDate: z
        .string()
        .optional()
        .describe(
          'Oldest article date (ISO 8601 format, e.g. "2024-01-01" or "2024-01-01T00:00:00").'
        ),
      toDate: z
        .string()
        .optional()
        .describe(
          'Newest article date (ISO 8601 format, e.g. "2024-12-31" or "2024-12-31T23:59:59").'
        ),
      language: languageEnum.optional(),
      sortBy: sortByEnum.optional(),
      pageSize: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of results per page (1-100, default 100).'),
      page: z.number().min(1).optional().describe('Page number to retrieve (default 1).')
    })
  )
  .output(
    z.object({
      totalResults: z.number().describe('Total number of matching articles'),
      articles: z.array(articleSchema).describe('List of matching articles')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.searchArticles({
      q: ctx.input.query,
      searchIn: ctx.input.searchIn,
      sources: ctx.input.sources,
      domains: ctx.input.domains,
      excludeDomains: ctx.input.excludeDomains,
      from: ctx.input.fromDate,
      to: ctx.input.toDate,
      language: ctx.input.language,
      sortBy: ctx.input.sortBy,
      pageSize: ctx.input.pageSize,
      page: ctx.input.page
    });

    let articles = result.articles.map(a => ({
      sourceId: a.source.id,
      sourceName: a.source.name,
      author: a.author,
      title: a.title,
      description: a.description,
      url: a.url,
      imageUrl: a.urlToImage,
      publishedAt: a.publishedAt,
      content: a.content
    }));

    return {
      output: {
        totalResults: result.totalResults,
        articles
      },
      message: `Found **${result.totalResults}** articles. Returned **${articles.length}** results${ctx.input.page ? ` (page ${ctx.input.page})` : ''}.`
    };
  })
  .build();
