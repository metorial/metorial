import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchNewsV2 = SlateTool.create(spec, {
  name: 'Search News V2',
  key: 'search_news_v2',
  description:
    'Search news using the canonical V2 category taxonomy and cursor pagination. Filter by keywords or boolean query, publication dates, language, country, domain, author, and article metadata availability.',
  instructions: [
    'Call get_available_filters with apiVersion v2 for the canonical V2 category values. V1 category names are not interchangeable.',
    'Pass nextCursor from the preceding response as cursor with the same search filters to fetch the next page. Null means the cursor results are exhausted.',
    'Dates must be RFC 3339 timestamps, such as 2026-09-01T00:00:00Z. History and date-span limits depend on the account plan.',
    'Offset requests are rejected when (pageNumber - 1) * pageSize exceeds 5000; use cursor pagination for deeper searches.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      keywords: z
        .string()
        .optional()
        .describe('Keyword search. Takes precedence over query if both are supplied.'),
      query: z
        .string()
        .optional()
        .describe('Boolean expression using AND, OR, NOT, quotes, and parentheses.'),
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
        .describe(
          'Comma-separated canonical V2 categories from get_available_filters with apiVersion v2.'
        ),
      startDate: z.string().optional().describe('Range start as an RFC 3339 timestamp.'),
      endDate: z.string().optional().describe('Range end as an RFC 3339 timestamp.'),
      contentType: z
        .number()
        .optional()
        .describe('Content type: 1 for news, 2 for articles, or 3 for discussion.'),
      domain: z
        .string()
        .optional()
        .describe('Include articles from this publisher domain, without a URL scheme.'),
      domainNot: z
        .string()
        .optional()
        .describe('Exclude articles from this publisher domain.'),
      author: z.string().optional().describe('Case-insensitive exact author filter.'),
      hasImage: z
        .boolean()
        .optional()
        .describe('When true, require an image. False disables the filter.'),
      hasDescription: z
        .boolean()
        .optional()
        .describe('When true, require a description. False disables the filter.'),
      pageNumber: z.number().optional().describe('Integer offset page number from 1 to 180.'),
      pageSize: z
        .number()
        .optional()
        .describe('Integer results per page from 1 to 300, subject to account plan limits.'),
      limit: z
        .number()
        .optional()
        .describe(
          'Integer result cap from 1 to 300, subject to page size and account plan limits.'
        ),
      cursor: z
        .string()
        .optional()
        .describe(
          'Opaque nextCursor returned by the previous response; keep the search filters unchanged.'
        )
    })
  )
  .output(
    z.object({
      articles: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Original article objects, preserving available fields and null values'),
      page: z.number().describe('Page index returned by the provider'),
      nextCursor: z
        .string()
        .nullable()
        .optional()
        .describe('Provider continuation cursor, or null when exhausted'),
      raw: z.record(z.string(), z.unknown()).describe('Complete provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.searchNewsV2({ ...ctx.input, type: ctx.input.contentType });
    return {
      output: {
        articles: result.news,
        page: result.page,
        nextCursor: result.next_cursor,
        raw: result
      },
      message: `Found **${result.news.length}** articles.`
    };
  })
  .build();
