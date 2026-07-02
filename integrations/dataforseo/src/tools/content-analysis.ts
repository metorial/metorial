import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let isRecord = (value: unknown): value is Record<string, number> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let contentItemSchema = z
  .object({
    type: z.string().optional().describe('Type of content (e.g., "page_content")'),
    url: z.string().optional().describe('URL of the content'),
    domain: z.string().optional().describe('Domain of the content'),
    title: z.string().optional().describe('Page title'),
    mainTitle: z.string().optional().describe('Main title of the page'),
    language: z.string().optional().describe('Content language'),
    sentimentConnotation: z
      .string()
      .optional()
      .describe('Sentiment connotation (positive, negative, neutral)'),
    connotationTypes: z
      .record(z.string(), z.number())
      .optional()
      .describe('Breakdown of sentiment connotation types'),
    pageCategory: z
      .array(z.union([z.string(), z.number()]))
      .optional()
      .describe('DataForSEO content category names or IDs for the page'),
    datePublished: z.string().optional().describe('Date content was published'),
    contentQualityScore: z.number().optional().describe('Content quality score')
  })
  .passthrough();

export let contentAnalysis = SlateTool.create(spec, {
  name: 'Content Analysis',
  key: 'content_analysis',
  description: `Search for and analyze web content mentioning a specific keyword or brand across the web. Provides sentiment analysis, content quality scores, publication dates, and category classifications. Choose between search mode (individual results) or summary mode (aggregate statistics). Ideal for brand monitoring, content research, and competitive intelligence.`,
  instructions: [
    'Provide a keyword or brand name to search for across the web.',
    'Use "search" mode to get individual content results with sentiment, or "summary" mode for aggregate stats.',
    'Filter by sentiment connotation (positive, negative, neutral) to focus analysis.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      keyword: z.string().describe('Keyword or brand name to search for'),
      mode: z
        .enum(['search', 'summary'])
        .default('search')
        .describe(
          'Analysis mode: "search" for individual results, "summary" for aggregate statistics'
        ),
      sentimentConnotation: z
        .enum(['positive', 'negative', 'neutral'])
        .optional()
        .describe('Filter by sentiment connotation'),
      pageType: z
        .array(z.string())
        .optional()
        .describe('Filter by page type (e.g., ["ecommerce", "news", "blogs"])'),
      searchMode: z
        .string()
        .optional()
        .describe('Search mode (e.g., "as_is" for exact match)'),
      limit: z.number().optional().describe('Maximum number of results (search mode only)'),
      offset: z.number().optional().describe('Pagination offset (search mode only)'),
      orderBy: z
        .array(z.string())
        .optional()
        .describe('Order results (e.g., ["content_quality_score,desc"])')
    })
  )
  .output(
    z.object({
      keyword: z.string().describe('Searched keyword'),
      totalCount: z.number().optional().describe('Total matching results'),
      items: z
        .array(contentItemSchema)
        .optional()
        .describe('Individual content items (search mode)'),
      summary: z
        .object({
          totalCount: z.number().optional().describe('Total mentions found'),
          sentimentConnotations: z
            .record(z.string(), z.number())
            .optional()
            .describe('Sentiment distribution'),
          topDomains: z.array(z.string()).optional().describe('Top mentioning domains'),
          connotationTypes: z
            .record(z.string(), z.number())
            .optional()
            .describe('Connotation type breakdown')
        })
        .optional()
        .describe('Aggregate statistics (summary mode)'),
      cost: z.number().optional().describe('API cost')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.mode === 'search') {
      let response = await client.contentAnalysisSearchLive({
        keyword: ctx.input.keyword,
        sentimentConnotation: ctx.input.sentimentConnotation,
        pageType: ctx.input.pageType,
        searchMode: ctx.input.searchMode,
        limit: ctx.input.limit,
        offset: ctx.input.offset,
        orderBy: ctx.input.orderBy
      });

      let result = client.extractFirstResult(response);
      let items = (result?.items ?? []).map((item: any) => ({
        type: item.type,
        url: item.url,
        domain: item.domain,
        title: item.title,
        mainTitle: item.main_title,
        language: item.language,
        sentimentConnotation: item.sentiment_connotations?.sentiment_connotation,
        connotationTypes: isRecord(item.connotation_types)
          ? item.connotation_types
          : undefined,
        pageCategory: Array.isArray(item.page_category) ? item.page_category : undefined,
        datePublished: item.date_published,
        contentQualityScore: item.content_quality_score
      }));

      return {
        output: {
          keyword: ctx.input.keyword,
          totalCount: result?.total_count,
          items,
          cost: response.cost
        },
        message: `Found **${items.length}** content items mentioning **"${ctx.input.keyword}"** (total: ${result?.total_count ?? 'unknown'}).`
      };
    } else {
      let response = await client.contentAnalysisSummaryLive({
        keyword: ctx.input.keyword,
        pageType: ctx.input.pageType
      });

      let result = client.extractFirstResult(response);

      return {
        output: {
          keyword: ctx.input.keyword,
          summary: {
            totalCount: result?.total_count,
            sentimentConnotations: result?.sentiment_connotations,
            topDomains: result?.top_domains,
            connotationTypes: result?.connotation_types
          },
          cost: response.cost
        },
        message: `Content summary for **"${ctx.input.keyword}"**: **${result?.total_count ?? 0}** mentions found across the web.`
      };
    }
  })
  .build();
