import { SlateTool } from 'slates';
import { z } from 'zod';
import { PerigonClient } from '../lib/client';
import { spec } from '../spec';

let sentimentSchema = z.object({
  positive: z.number().describe('Positive sentiment score (0-1)'),
  negative: z.number().describe('Negative sentiment score (0-1)'),
  neutral: z.number().describe('Neutral sentiment score (0-1)')
});

let articleSchema = z.object({
  articleId: z.string().describe('Unique article identifier'),
  title: z.string().describe('Article headline'),
  description: z.string().describe('Article description or subtitle'),
  url: z.string().describe('URL to the original article'),
  imageUrl: z.string().describe('URL to the article image'),
  authorsByline: z.string().describe('Author byline as published'),
  pubDate: z.string().describe('Publication date (ISO 8601)'),
  addDate: z.string().describe('Date added to Perigon index (ISO 8601)'),
  sourceDomain: z.string().describe('Source website domain'),
  country: z.string().describe('Country code of the source'),
  language: z.string().describe('Language code of the article'),
  clusterId: z.string().describe('Story cluster ID for grouping related articles'),
  reprint: z.boolean().describe('Whether this is a reprint'),
  categories: z.array(z.string()).describe('Article categories'),
  topics: z.array(z.string()).describe('Article topics'),
  sentiment: sentimentSchema.describe('Sentiment analysis scores'),
  labels: z.array(z.string()).describe('Smart labels (e.g. Opinion, Paid News, Review)'),
  summary: z.string().describe('AI-generated article summary'),
  people: z
    .array(
      z.object({
        wikidataId: z.string(),
        name: z.string(),
        mentions: z.number()
      })
    )
    .describe('People mentioned in the article'),
  companies: z
    .array(
      z.object({
        companyId: z.string(),
        name: z.string(),
        mentions: z.number()
      })
    )
    .describe('Companies mentioned in the article'),
  keywords: z
    .array(
      z.object({
        name: z.string(),
        weight: z.number()
      })
    )
    .describe('Extracted keywords with relevance weights')
});

export let searchArticles = SlateTool.create(spec, {
  name: 'Search Articles',
  key: 'search_articles',
  description: `Search and retrieve news articles from 200,000+ global sources. Supports keyword search with Boolean operators (AND, OR, NOT) and filtering by source, category, topic, country, date range, sentiment, people, and companies mentioned. Each article includes AI-enriched metadata like sentiment scores, entity extraction, and summaries.`,
  instructions: [
    'Use Boolean operators in the query field: AND, OR, NOT (e.g. "climate AND policy NOT carbon")',
    'Set showReprints to false to exclude duplicate articles and get only unique coverage',
    'Use sourceGroup (top10, top50, top100, top500, top1000) to filter by source prominence',
    'Date parameters accept ISO 8601 format (e.g. "2024-01-15" or "2024-01-15T10:00:00")'
  ],
  constraints: [
    'Maximum 100 results per page',
    'Maximum 10,000 articles per query — split into date sub-ranges for larger datasets'
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
        .describe('Search keywords with optional Boolean operators (AND, OR, NOT)'),
      title: z.string().optional().describe('Search within article titles only'),
      source: z.string().optional().describe('Filter by source domain (e.g. "cnn.com")'),
      excludeSource: z
        .string()
        .optional()
        .describe('Exclude articles from this source domain'),
      sourceGroup: z
        .enum(['top10', 'top50', 'top100', 'top500', 'top1000'])
        .optional()
        .describe('Filter by pre-defined source group'),
      category: z
        .string()
        .optional()
        .describe(
          'Filter by category (e.g. Tech, Business, Politics, Sports, Finance, Entertainment, Health, Environment, Travel, Auto)'
        ),
      topic: z.string().optional().describe('Filter by topic'),
      country: z
        .string()
        .optional()
        .describe('Filter by country code (ISO 3166-1 alpha-2, e.g. "us", "gb")'),
      language: z.string().optional().describe('Filter by language code (e.g. "en", "es")'),
      label: z
        .string()
        .optional()
        .describe('Filter by smart label (e.g. Opinion, Analysis, Fact Check, Paid News)'),
      excludeLabel: z
        .string()
        .optional()
        .describe('Exclude articles with this smart label (e.g. Non-news, Opinion)'),
      personName: z.string().optional().describe('Filter by person mentioned in articles'),
      companyName: z.string().optional().describe('Filter by company mentioned in articles'),
      city: z.string().optional().describe('Filter by city referenced in articles'),
      state: z.string().optional().describe('Filter by state referenced in articles'),
      clusterId: z
        .string()
        .optional()
        .describe('Get all articles belonging to a specific story cluster'),
      dateFrom: z.string().optional().describe('Start date filter (ISO 8601)'),
      dateTo: z.string().optional().describe('End date filter (ISO 8601)'),
      showReprints: z
        .boolean()
        .optional()
        .describe('Include reprints/duplicates (default: true)'),
      sortBy: z
        .enum(['date', 'relevance', 'addDate'])
        .optional()
        .describe('Sort order for results'),
      page: z.number().optional().describe('Page number (zero-based)'),
      size: z.number().optional().describe('Results per page (1-100, default: 10)')
    })
  )
  .output(
    z.object({
      numResults: z.number().describe('Total number of matching articles'),
      articles: z.array(articleSchema).describe('List of matching articles')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PerigonClient(ctx.auth.token);

    let result = await client.searchArticles({
      q: ctx.input.query,
      title: ctx.input.title,
      source: ctx.input.source,
      excludeSource: ctx.input.excludeSource,
      sourceGroup: ctx.input.sourceGroup,
      category: ctx.input.category,
      topic: ctx.input.topic,
      country: ctx.input.country,
      language: ctx.input.language,
      label: ctx.input.label,
      excludeLabel: ctx.input.excludeLabel,
      personName: ctx.input.personName,
      companyName: ctx.input.companyName,
      city: ctx.input.city,
      state: ctx.input.state,
      clusterId: ctx.input.clusterId,
      from: ctx.input.dateFrom,
      to: ctx.input.dateTo,
      showReprints: ctx.input.showReprints,
      sortBy: ctx.input.sortBy,
      page: ctx.input.page,
      size: ctx.input.size
    });

    let articles = (result.articles || []).map(a => ({
      articleId: a.articleId || '',
      title: a.title || '',
      description: a.description || '',
      url: a.url || '',
      imageUrl: a.imageUrl || '',
      authorsByline: a.authorsByline || '',
      pubDate: a.pubDate || '',
      addDate: a.addDate || '',
      sourceDomain: a.source?.domain || '',
      country: a.country || '',
      language: a.language || '',
      clusterId: a.clusterId || '',
      reprint: a.reprint || false,
      categories: (a.categories || []).map(c => c.name),
      topics: (a.topics || []).map(t => t.name),
      sentiment: a.sentiment || { positive: 0, negative: 0, neutral: 0 },
      labels: a.labels || [],
      summary: a.summary || '',
      people: (a.people || []).map(p => ({
        wikidataId: p.wikidataId || '',
        name: p.name || '',
        mentions: p.mentions || 0
      })),
      companies: (a.companies || []).map(c => ({
        companyId: c.id || '',
        name: c.name || '',
        mentions: c.mentions || 0
      })),
      keywords: (a.keywords || []).map(k => ({
        name: k.name || '',
        weight: k.weight || 0
      }))
    }));

    let articleCount = articles.length;
    let totalCount = result.numResults || 0;

    return {
      output: {
        numResults: totalCount,
        articles
      },
      message: `Found **${totalCount}** articles (showing ${articleCount} on this page).`
    };
  })
  .build();
