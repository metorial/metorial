import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapArticle, pageOutput } from '../lib/schemas';
import { spec } from '../spec';

let articleSummarySchema = z.object({
  id: z.string().optional().describe('Unique article ID'),
  resourceUri: z.string().optional().describe('Resource URI of the article'),
  title: z.string().optional().describe('Article title'),
  description: z.string().optional().describe('Article description'),
  type: z.string().optional().describe('Article type: product or service'),
  articleNumber: z.string().optional().describe('Article number'),
  gtin: z.string().optional().describe('Global Trade Item Number'),
  unitName: z.string().optional().describe('Unit name'),
  price: z
    .object({
      netPrice: z.number().optional(),
      grossPrice: z.number().optional(),
      taxRatePercentage: z.number().optional(),
      leadingPrice: z.string().optional()
    })
    .optional()
    .describe('Pricing details')
});

export let listArticles = SlateTool.create(spec, {
  name: 'List Articles',
  key: 'list_articles',
  description: `Lists articles (products and services) from Lexoffice with optional filtering by article number, GTIN, or type. Results are paginated.`,
  instructions: [
    'Use the type filter to narrow results to "product" or "service".',
    'Page numbering starts at 0.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      articleNumber: z.string().optional().describe('Filter by exact article number'),
      gtin: z.string().optional().describe('Filter by Global Trade Item Number'),
      type: z.enum(['product', 'service']).optional().describe('Filter by article type'),
      size: z.number().optional().describe('Page size, between 1 and 250'),
      page: z.number().optional().describe('Page number (starting from 0)')
    })
  )
  .output(
    z.object({
      articles: z.array(articleSummarySchema).describe('List of articles'),
      currentPage: z.number().optional().describe('Actual zero-based page index'),
      first: z.boolean().optional().describe('Whether this is the first page'),
      last: z
        .boolean()
        .optional()
        .describe('Whether this is the last page in the search window'),
      nextPage: z.number().optional().describe('Next page index, when available'),
      searchWindowLimit: z.number().optional().describe('Maximum searchable results'),
      windowMayBeTruncated: z
        .boolean()
        .optional()
        .describe('Whether narrower filters may be needed beyond the search window'),
      count: z.number().describe('Number of articles returned on this page'),
      totalPages: z.number().optional().describe('Total number of pages available'),
      totalElements: z
        .number()
        .optional()
        .describe('Total number of articles matching the filter')
    })
  )
  .handleInvocation(async ctx => {
    const result = await new Client({ token: ctx.auth.token }).listArticles(ctx.input);
    const articles = result.content.map(mapArticle);
    return {
      output: { articles, count: articles.length, ...pageOutput(result) },
      message: `Retrieved ${articles.length} article(s) on page ${result.number}.`
    };
  })
  .build();
