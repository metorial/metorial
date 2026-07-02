import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { apolloServiceError } from '../lib/errors';
import { spec } from '../spec';

let recordSchema = z.record(z.string(), z.any());
let datePattern = /^\d{4}-\d{2}-\d{2}$/;

let optionalString = (value: unknown) =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

let optionalStringArray = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : undefined;

let isRecord = (value: unknown): value is Record<string, any> =>
  typeof value === 'object' && value !== null;

let validateDate = (value: string | undefined, label: string) => {
  if (value === undefined) {
    return undefined;
  }

  if (!datePattern.test(value)) {
    throw apolloServiceError(`${label} must use YYYY-MM-DD format.`);
  }

  let date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw apolloServiceError(`${label} must be a valid calendar date.`);
  }

  return value;
};

let nestedRecord = (value: unknown) => (isRecord(value) ? value : undefined);

let nestedString = (value: unknown, key: string) => optionalString(nestedRecord(value)?.[key]);

let formatNewsArticle = (article: Record<string, any>) => {
  let source = nestedRecord(article.source);
  let organization = nestedRecord(article.organization);

  return {
    articleId: optionalString(article.id),
    title: optionalString(article.title),
    url: optionalString(article.url),
    sourceName:
      optionalString(article.source_name) ||
      optionalString(article.publisher) ||
      nestedString(source, 'name'),
    sourceUrl: optionalString(article.source_url) || nestedString(source, 'url'),
    summary: optionalString(article.summary) || optionalString(article.description),
    category: optionalString(article.category),
    categories: optionalStringArray(article.categories),
    publishedAt:
      optionalString(article.published_at) || optionalString(article.published_date),
    organizationId:
      optionalString(article.organization_id) || nestedString(organization, 'id'),
    organizationName:
      optionalString(article.organization_name) || nestedString(organization, 'name'),
    raw: article
  };
};

let newsArticleOutputSchema = z.object({
  articleId: z.string().optional(),
  title: z.string().optional(),
  url: z.string().optional(),
  sourceName: z.string().optional(),
  sourceUrl: z.string().optional(),
  summary: z.string().optional(),
  category: z.string().optional(),
  categories: z.array(z.string()).optional(),
  publishedAt: z.string().optional(),
  organizationId: z.string().optional(),
  organizationName: z.string().optional(),
  raw: recordSchema
});

export let searchNewsArticles = SlateTool.create(spec, {
  name: 'Search News Articles',
  key: 'search_news_articles',
  description:
    'Search Apollo news articles related to specific companies by Apollo organization ID. Use Search Organizations first when you only have a company name or domain.',
  instructions: [
    'Provide Apollo organization IDs from Search Organizations or Get Organization.',
    'Use publishedAtMin and publishedAtMax together to bound results by publication date.',
    'Keep perPage small because this endpoint consumes Apollo credits when data is returned.'
  ],
  constraints: ['Consumes Apollo credits per page when data is returned'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      organizationIds: z
        .array(z.string())
        .min(1)
        .describe('Apollo organization IDs to include in the news search.'),
      categories: z
        .array(z.string())
        .optional()
        .describe(
          'News categories or sub-categories to include, e.g. hires, investment, contract.'
        ),
      publishedAtMin: z
        .string()
        .optional()
        .describe('Lower publication date bound in YYYY-MM-DD format.'),
      publishedAtMax: z
        .string()
        .optional()
        .describe('Upper publication date bound in YYYY-MM-DD format.'),
      page: z.number().int().positive().optional().describe('Page number (default: 1)'),
      perPage: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Results per page (default: 10)')
    })
  )
  .output(
    z.object({
      newsArticles: z.array(newsArticleOutputSchema),
      totalEntries: z.number().optional(),
      currentPage: z.number().optional(),
      totalPages: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let publishedAtMin = validateDate(ctx.input.publishedAtMin, 'publishedAtMin');
    let publishedAtMax = validateDate(ctx.input.publishedAtMax, 'publishedAtMax');

    if (
      publishedAtMin !== undefined &&
      publishedAtMax !== undefined &&
      publishedAtMin > publishedAtMax
    ) {
      throw apolloServiceError('publishedAtMin must be on or before publishedAtMax.');
    }

    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });
    let result = await client.searchNewsArticles({
      organizationIds: ctx.input.organizationIds,
      categories: ctx.input.categories,
      publishedAtMin,
      publishedAtMax,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });
    let newsArticles = result.newsArticles.map(formatNewsArticle);

    return {
      output: {
        newsArticles,
        totalEntries: result.pagination?.total_entries,
        currentPage: result.pagination?.page,
        totalPages: result.pagination?.total_pages
      },
      message: `Found **${result.pagination?.total_entries ?? newsArticles.length}** news article(s). Returned ${newsArticles.length}.`
    };
  })
  .build();
