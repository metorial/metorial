import { SlateTool } from 'slates';
import { z } from 'zod';
import { SearchApiClient } from '../lib/client';
import { spec } from '../spec';

let newsArticleSchema = z.object({
  position: z.number().optional().describe('Position in results'),
  title: z.string().optional().describe('Article headline'),
  link: z.string().optional().describe('URL of the article'),
  source: z.string().optional().describe('News source name'),
  date: z.string().optional().describe('Publication date'),
  snippet: z.string().optional().describe('Article preview text'),
  thumbnail: z.string().optional().describe('Thumbnail image URL')
});

export let newsSearch = SlateTool.create(spec, {
  name: 'Google News Search',
  key: 'news_search',
  description: `Search Google News for real-time news articles and headlines. Returns structured news results with source, publication date, and snippets. Supports date range filtering, sorting, and geo-targeted news.`,
  instructions: [
    'Use **sortBy** to get the most recent articles instead of relevance-based results.',
    'Use **timePeriod** or custom date ranges to search for news from specific time windows.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('News search query'),
      location: z.string().optional().describe('Geographic location for news'),
      country: z.string().optional().describe('Country code (e.g., "us", "gb")'),
      language: z.string().optional().describe('Interface language code (e.g., "en")'),
      device: z.enum(['desktop', 'mobile', 'tablet']).optional().describe('Device type'),
      page: z.number().optional().describe('Results page number'),
      sortBy: z
        .enum(['relevance', 'most_recent'])
        .optional()
        .describe('Sort order for results'),
      timePeriod: z
        .enum(['last_hour', 'last_day', 'last_week', 'last_month', 'last_year'])
        .optional()
        .describe('Filter articles by recency'),
      timePeriodMin: z
        .string()
        .optional()
        .describe('Start date for custom range (MM/DD/YYYY)'),
      timePeriodMax: z.string().optional().describe('End date for custom range (MM/DD/YYYY)')
    })
  )
  .output(
    z.object({
      searchQuery: z.string().optional().describe('The query that was searched'),
      totalResults: z.number().optional().describe('Total number of results'),
      articles: z.array(newsArticleSchema).describe('News articles'),
      currentPage: z.number().optional().describe('Current page number'),
      nextPageLink: z.string().optional().describe('URL for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SearchApiClient({ token: ctx.auth.token });

    let data = await client.search({
      engine: 'google_news',
      q: ctx.input.query,
      location: ctx.input.location,
      gl: ctx.input.country,
      hl: ctx.input.language,
      device: ctx.input.device,
      page: ctx.input.page,
      sort_by: ctx.input.sortBy === 'most_recent' ? 'most_recent' : undefined,
      time_period: ctx.input.timePeriod,
      time_period_min: ctx.input.timePeriodMin,
      time_period_max: ctx.input.timePeriodMax
    });

    let articles = (data.organic_results || []).map((r: any) => ({
      position: r.position,
      title: r.title,
      link: r.link,
      source: r.source?.name || r.source,
      date: r.date,
      snippet: r.snippet,
      thumbnail: r.thumbnail
    }));

    return {
      output: {
        searchQuery: data.search_parameters?.q || ctx.input.query,
        totalResults: data.search_information?.total_results,
        articles,
        currentPage: data.pagination?.current,
        nextPageLink: data.pagination?.next
      },
      message: `Found ${articles.length} news article${articles.length !== 1 ? 's' : ''} for "${ctx.input.query}".`
    };
  })
  .build();
