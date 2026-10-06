import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, pagination, records } from '../lib/client';
import { spec } from '../spec';

export let searchNews = SlateTool.create(spec, {
  name: 'Search News',
  key: 'search_news',
  description: `Search for recent news about companies in the ZoomInfo database. Returns news articles, press releases, and related coverage. Useful for staying updated on prospects and accounts.`,
  constraints: [
    'Current GTM company news requests require allowCompanyEnrichment=true and can consume credits. Non-company news searches do not consume credits but count against request limits.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      companyId: z.number().optional().describe('ZoomInfo company ID'),
      companyName: z
        .string()
        .optional()
        .describe(
          'Company name; current GTM resolves an exact match before authorized company enrichment'
        ),
      categories: z
        .array(z.string())
        .optional()
        .describe('Current GTM news categories from Lookup Data'),
      urls: z.array(z.string()).optional().describe('Current GTM news article URLs to match'),
      allowCompanyEnrichment: z
        .boolean()
        .optional()
        .describe(
          'Explicitly authorize current GTM company news enrichment, which can consume credits'
        ),
      keywords: z
        .array(z.string())
        .optional()
        .describe(
          'Legacy text keyword search; current GTM connections use categories or urls'
        ),
      publishedDateAfter: z
        .string()
        .optional()
        .describe(
          'Current GTM earliest inclusive publishing day (YYYY-MM-DD); legacy connections retain ISO 8601 input'
        ),
      page: z.number().min(1).optional().describe('Page number'),
      pageSize: z.number().min(1).max(100).optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      articles: z
        .array(z.record(z.string(), z.unknown()))
        .describe('News articles and coverage'),
      totalResults: z.number().optional().describe('Total matching articles'),
      currentPage: z.number().optional().describe('Provider current page'),
      totalPages: z.number().optional().describe('Provider total pages'),
      returnedCount: z.number().optional().describe('Number of records in this response')
    })
  )
  .handleInvocation(async ctx => {
    const client = Client.fromContext(ctx);

    let { page, pageSize, ...searchParams } = ctx.input;

    let result = await client.searchNews(searchParams, page, pageSize);

    const articles = records(result);
    const { totalResults, currentPage, totalPages } = pagination(result);

    return {
      output: {
        articles,
        totalResults,
        currentPage,
        totalPages,
        returnedCount: articles.length
      },
      message: `Found **${totalResults ?? articles.length}** news article(s).`
    };
  })
  .build();
