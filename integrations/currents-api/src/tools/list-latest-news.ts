import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listLatestNews = SlateTool.create(spec, {
  name: 'List Latest News',
  key: 'list_latest_news',
  description:
    'Retrieve a current news feed with language, country, category, source-domain, author, and content-type filters. Supports page-based pagination and returns original article metadata. Use search_news for keywords or date ranges.',
  instructions: [
    'Use get_available_filters with apiVersion v1 to discover valid categories, language codes, and country codes.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      language: z
        .string()
        .optional()
        .describe('Language code. The provider defaults to English.'),
      country: z
        .string()
        .optional()
        .describe('Two-letter country code from get_available_filters.'),
      category: z
        .string()
        .optional()
        .describe('One or more comma-separated v1 categories from get_available_filters.'),
      domain: z
        .string()
        .optional()
        .describe('Include articles from this publisher domain, without a URL scheme.'),
      domainNot: z
        .string()
        .optional()
        .describe('Exclude articles from this publisher domain.'),
      author: z.string().optional().describe('Author filter.'),
      contentType: z
        .number()
        .optional()
        .describe('Content type: 1 for news, 2 for articles, or 3 for discussion.'),
      pageNumber: z
        .number()
        .optional()
        .describe('Integer page number from 1 to 180. Defaults to 1 at the provider.'),
      pageSize: z
        .number()
        .optional()
        .describe(
          'Integer results per page from 1 to 300, subject to the account plan. Provider default is up to 30.'
        )
    })
  )
  .output(
    z.object({
      articles: z
        .array(z.record(z.string(), z.unknown()))
        .describe(
          'Original article objects, including IDs, publisher URLs, timestamps, and available metadata without fabricated values'
        ),
      page: z.number().describe('Page number returned by the provider'),
      raw: z.record(z.string(), z.unknown()).describe('Complete provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getCurrentLatestNews({
      ...ctx.input,
      type: ctx.input.contentType
    });
    return {
      output: { articles: result.news, page: result.page, raw: result },
      message: `Retrieved **${result.news.length}** latest news articles on page ${result.page}.`
    };
  })
  .build();
