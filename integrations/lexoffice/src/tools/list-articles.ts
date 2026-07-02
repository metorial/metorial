import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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

let mapArticle = (article: any) => ({
  id: article.id,
  resourceUri: article.resourceUri,
  title: article.title,
  description: article.description,
  type: article.type,
  articleNumber: article.articleNumber,
  gtin: article.gtin,
  unitName: article.unitName,
  price: article.price
    ? {
        netPrice: article.price.netPrice,
        grossPrice: article.price.grossPrice,
        taxRatePercentage: article.price.taxRatePercentage,
        leadingPrice: article.price.leadingPrice
      }
    : undefined
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
      page: z.number().optional().describe('Page number (starting from 0)')
    })
  )
  .output(
    z.object({
      articles: z.array(articleSummarySchema).describe('List of articles'),
      count: z.number().describe('Number of articles returned on this page'),
      totalPages: z.number().optional().describe('Total number of pages available'),
      totalElements: z
        .number()
        .optional()
        .describe('Total number of articles matching the filter')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listArticles({
      articleNumber: ctx.input.articleNumber,
      gtin: ctx.input.gtin,
      type: ctx.input.type,
      page: ctx.input.page
    });

    let articles = (result.content || []).map(mapArticle);

    return {
      output: {
        articles,
        count: articles.length,
        totalPages: result.totalPages,
        totalElements: result.totalElements
      },
      message: `Found **${articles.length}** article(s)${result.totalElements !== undefined ? ` of ${result.totalElements} total` : ''}${ctx.input.page !== undefined ? ` on page ${ctx.input.page}` : ''}.`
    };
  })
  .build();
