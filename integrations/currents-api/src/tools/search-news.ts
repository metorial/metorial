import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let newsArticleSchema = z.object({
  articleId: z.string().describe('Unique identifier of the article'),
  title: z.string().describe('Headline of the article'),
  description: z.string().describe('Brief summary or body of the article'),
  url: z.string().describe('URL to the full article'),
  imageUrl: z.string().describe('URL of the article image'),
  publishedAt: z.string().describe('Publication date and time in ISO 8601 format'),
  language: z.string().describe('Language code of the article'),
  categories: z.array(z.string()).describe('Categories the article belongs to'),
  author: z.string().describe('Author of the article'),
  countries: z.array(z.string()).describe('Country codes associated with the article')
});

export let searchNews = SlateTool.create(spec, {
  name: 'Search News',
  key: 'search_news',
  description: `Search through tens of millions of articles from over 14,000 news sources and blogs. Supports keyword search, date range filtering, content type filtering, domain inclusion/exclusion, and pagination. Ideal for finding articles on specific topics, researching historical news, or building targeted news feeds.`,
  instructions: [
    'Use RFC 3339 format for date parameters, e.g., "2025-01-15T00:00:00+00:00".',
    'Content type 1 = news, 2 = articles, 3 = discussion content.',
    'Domain filters should use the primary domain without protocol prefix, e.g., "bbc.com" not "https://www.bbc.com".'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      keywords: z
        .string()
        .optional()
        .describe('Keywords to search for in article titles and descriptions'),
      language: z
        .string()
        .optional()
        .describe(
          'Language code to filter results (e.g., "en", "es", "fr"). Defaults to English.'
        ),
      country: z
        .string()
        .optional()
        .describe('Country code to filter by news source region (e.g., "US", "GB")'),
      category: z
        .string()
        .optional()
        .describe(
          'News category filter (e.g., "technology", "business", "sports", "politics", "health", "science", "entertainment", "world", "finance", "programming", "academia", "lifestyle", "opinion", "food", "game", "general", "regional")'
        ),
      startDate: z
        .string()
        .optional()
        .describe(
          'Start of date range in RFC 3339 format (e.g., "2025-01-15T00:00:00+00:00")'
        ),
      endDate: z
        .string()
        .optional()
        .describe('End of date range in RFC 3339 format (e.g., "2025-01-20T23:59:59+00:00")'),
      contentType: z
        .number()
        .optional()
        .describe('Content type filter: 1 = news, 2 = articles, 3 = discussion content'),
      domain: z
        .string()
        .optional()
        .describe('Include only articles from this domain (e.g., "bbc.com")'),
      domainNot: z
        .string()
        .optional()
        .describe('Exclude articles from this domain (e.g., "example.com")'),
      pageNumber: z.number().optional().describe('Page number for pagination (starts at 1)'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of articles per page (1-200, default 30)')
    })
  )
  .output(
    z.object({
      articles: z.array(newsArticleSchema).describe('List of matching news articles'),
      page: z.number().describe('Current page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.searchNews({
      keywords: ctx.input.keywords,
      language: ctx.input.language,
      country: ctx.input.country,
      category: ctx.input.category,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      type: ctx.input.contentType,
      domain: ctx.input.domain,
      domainNot: ctx.input.domainNot,
      pageNumber: ctx.input.pageNumber,
      pageSize: ctx.input.pageSize
    });

    let articles = (result.news || []).map(article => ({
      articleId: article.id || '',
      title: article.title || '',
      description: article.description || '',
      url: article.url || '',
      imageUrl: article.image || '',
      publishedAt: article.published || '',
      language: article.language || '',
      categories: article.category || [],
      author: article.author || '',
      countries: article.country || []
    }));

    let searchDesc = ctx.input.keywords ? ` for "${ctx.input.keywords}"` : '';

    return {
      output: {
        articles,
        page: result.page || 1
      },
      message: `Found **${articles.length}** articles${searchDesc} on page ${result.page || 1}.`
    };
  })
  .build();
