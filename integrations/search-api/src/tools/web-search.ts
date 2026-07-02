import { SlateTool } from 'slates';
import { z } from 'zod';
import { SearchApiClient } from '../lib/client';
import { spec } from '../spec';

let organicResultSchema = z.object({
  position: z.number().optional().describe('Position in results'),
  title: z.string().optional().describe('Title of the result'),
  link: z.string().optional().describe('URL of the result'),
  snippet: z.string().optional().describe('Text snippet'),
  source: z.string().optional().describe('Display URL or source name'),
  date: z.string().optional().describe('Date of the result')
});

let adResultSchema = z.object({
  position: z.number().optional().describe('Position in ads'),
  title: z.string().optional().describe('Ad title'),
  link: z.string().optional().describe('Ad URL'),
  snippet: z.string().optional().describe('Ad description'),
  source: z.string().optional().describe('Advertiser display URL')
});

let relatedSearchSchema = z.object({
  query: z.string().optional().describe('Related search query'),
  link: z.string().optional().describe('URL for the related search')
});

export let webSearch = SlateTool.create(spec, {
  name: 'Web Search',
  key: 'web_search',
  description: `Perform a web search across multiple search engines including Google, Bing, Baidu, Yahoo, Yandex, DuckDuckGo, and Naver. Returns structured results including organic results, ads, knowledge graph data, answer boxes, and related searches. Supports localization, device targeting, date filtering, and SafeSearch.`,
  instructions: [
    'Use the **engine** parameter to select which search engine to query. Defaults to "google".',
    'Combine **gl**, **hl**, and **location** for precise geo-targeted results.',
    'Use **timePeriod** to filter results by recency (e.g., "last_day", "last_week").'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .describe('Search query terms. Supports operators like site:, inurl:, intitle:'),
      engine: z
        .enum([
          'google',
          'google_light',
          'bing',
          'baidu',
          'yahoo',
          'yandex',
          'duckduckgo',
          'naver'
        ])
        .optional()
        .describe('Search engine to use. Defaults to "google"'),
      location: z
        .string()
        .optional()
        .describe('Geographic location for search (e.g., "New York, NY")'),
      country: z
        .string()
        .optional()
        .describe('Country code for results (e.g., "us", "gb", "de")'),
      language: z
        .string()
        .optional()
        .describe('Interface language code (e.g., "en", "fr", "de")'),
      device: z
        .enum(['desktop', 'mobile', 'tablet'])
        .optional()
        .describe('Device type for results'),
      page: z.number().optional().describe('Results page number (default: 1)'),
      num: z.number().optional().describe('Number of results per page'),
      timePeriod: z
        .enum(['last_hour', 'last_day', 'last_week', 'last_month', 'last_year'])
        .optional()
        .describe('Filter results by recency'),
      timePeriodMin: z
        .string()
        .optional()
        .describe('Start date for custom range (MM/DD/YYYY)'),
      timePeriodMax: z.string().optional().describe('End date for custom range (MM/DD/YYYY)'),
      safeSearch: z
        .enum(['active', 'blur', 'off'])
        .optional()
        .describe('SafeSearch content filtering'),
      excludeAutocorrect: z.boolean().optional().describe('Exclude auto-corrected results')
    })
  )
  .output(
    z.object({
      searchQuery: z.string().optional().describe('The query that was searched'),
      totalResults: z.number().optional().describe('Total number of results'),
      timeTaken: z.number().optional().describe('Search time in seconds'),
      organicResults: z.array(organicResultSchema).describe('Organic search results'),
      ads: z.array(adResultSchema).optional().describe('Paid ad results'),
      answerBox: z.any().optional().describe('Answer box / featured snippet content'),
      knowledgeGraph: z.any().optional().describe('Knowledge graph data'),
      relatedSearches: z
        .array(relatedSearchSchema)
        .optional()
        .describe('Related search suggestions'),
      currentPage: z.number().optional().describe('Current page number'),
      nextPageLink: z.string().optional().describe('URL for next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SearchApiClient({ token: ctx.auth.token });

    let data = await client.search({
      engine: ctx.input.engine || 'google',
      q: ctx.input.query,
      location: ctx.input.location,
      gl: ctx.input.country,
      hl: ctx.input.language,
      device: ctx.input.device,
      page: ctx.input.page,
      num: ctx.input.num,
      time_period: ctx.input.timePeriod,
      time_period_min: ctx.input.timePeriodMin,
      time_period_max: ctx.input.timePeriodMax,
      safe: ctx.input.safeSearch,
      nfpr: ctx.input.excludeAutocorrect ? 1 : undefined
    });

    let organicResults = (data.organic_results || []).map((r: any) => ({
      position: r.position,
      title: r.title,
      link: r.link,
      snippet: r.snippet,
      source: r.source || r.displayed_link,
      date: r.date
    }));

    let ads = (data.ads || []).map((a: any) => ({
      position: a.position,
      title: a.title,
      link: a.link,
      snippet: a.snippet || a.description,
      source: a.source || a.displayed_link
    }));

    let relatedSearches = (data.related_searches || []).map((r: any) => ({
      query: r.query,
      link: r.link
    }));

    let resultCount = organicResults.length;

    return {
      output: {
        searchQuery: data.search_parameters?.q || ctx.input.query,
        totalResults: data.search_information?.total_results,
        timeTaken: data.search_information?.time_taken_displayed,
        organicResults,
        ads: ads.length > 0 ? ads : undefined,
        answerBox: data.answer_box || undefined,
        knowledgeGraph: data.knowledge_graph || undefined,
        relatedSearches: relatedSearches.length > 0 ? relatedSearches : undefined,
        currentPage: data.pagination?.current,
        nextPageLink: data.pagination?.next
      },
      message: `Found ${resultCount} organic result${resultCount !== 1 ? 's' : ''} for "${ctx.input.query}"${ctx.input.engine && ctx.input.engine !== 'google' ? ` on ${ctx.input.engine}` : ''}.`
    };
  })
  .build();
