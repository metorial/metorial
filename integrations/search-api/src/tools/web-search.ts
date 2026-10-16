import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { resultArray, SearchApiClient, type SearchParams } from '../lib/client';
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
    'Use country, language, and location where supported by the selected engine. Bing also supports marketCode; DuckDuckGo uses locale; Yahoo and Yandex use searchDomain.',
    'Use **timePeriod** to filter results by recency. Available filters depend on the selected engine.',
    'For Bing and DuckDuckGo, use nextPageToken from the previous response to continue the same query.'
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
      num: z
        .number()
        .optional()
        .describe(
          'Results per page for Bing or Baidu (maximum 50); Google currently always returns 10'
        ),
      nextPageToken: z
        .string()
        .optional()
        .describe('Continuation token for Bing or DuckDuckGo'),
      marketCode: z
        .string()
        .optional()
        .describe('Bing market code, such as en-US; cannot be combined with country'),
      locale: z
        .string()
        .optional()
        .describe('DuckDuckGo country-language locale, such as us-en'),
      searchDomain: z
        .string()
        .optional()
        .describe('Yahoo or Yandex search domain from the provider supported-domain list'),
      baiduLanguage: z
        .enum(['0', '1', '2'])
        .optional()
        .describe('Baidu language: 0 both Chinese variants, 1 simplified, 2 traditional'),
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
      raw: z.unknown().optional().describe('Complete provider response'),
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
      nextPageLink: z.string().optional().describe('URL for next page of results'),
      nextPageToken: z.string().optional().describe('Continuation token for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SearchApiClient({ token: ctx.auth.token });

    let engine = ctx.input.engine ?? 'google';
    let params: SearchParams = {
      engine,
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
      nfpr:
        ctx.input.excludeAutocorrect === undefined
          ? undefined
          : ctx.input.excludeAutocorrect
            ? 1
            : 0,
      next_page_token: ctx.input.nextPageToken
    };
    if (engine === 'bing') {
      if (ctx.input.country && ctx.input.marketCode) {
        throw createApiServiceError('Use either country or marketCode for Bing, not both.', {
          reason: 'invalid_bing_market'
        });
      }
      params.country_code = ctx.input.country?.toUpperCase();
      params.language = ctx.input.language;
      params.market_code = ctx.input.marketCode;
      params.safe_search = ctx.input.safeSearch
        ? { active: 'strict', blur: 'moderate', off: 'off' }[ctx.input.safeSearch]
        : undefined;
    } else if (engine === 'duckduckgo') {
      params.locale =
        ctx.input.locale ??
        (ctx.input.country && ctx.input.language
          ? `${ctx.input.country.toLowerCase()}-${ctx.input.language.toLowerCase()}`
          : undefined);
      params.safe = ctx.input.safeSearch
        ? { active: 'on', blur: 'moderate', off: 'off' }[ctx.input.safeSearch]
        : undefined;
      let periods: Record<string, string> = {
        last_day: 'past_day',
        last_week: 'past_week',
        last_month: 'past_month',
        last_year: 'past_year'
      };
      params.time_period = ctx.input.timePeriod
        ? (periods[ctx.input.timePeriod] ?? ctx.input.timePeriod)
        : undefined;
      let start = ctx.input.timePeriodMin
        ? /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(ctx.input.timePeriodMin)
        : null;
      let end = ctx.input.timePeriodMax
        ? /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(ctx.input.timePeriodMax)
        : null;
      if (start && end) {
        params.time_period = `${start[3]}-${start[1]}-${start[2]}..${end[3]}-${end[1]}-${end[2]}`;
      }
    } else if (engine === 'yahoo') {
      params.yahoo_domain = ctx.input.searchDomain;
      params.safe = ctx.input.safeSearch
        ? { active: 'on', blur: 'moderate', off: 'off' }[ctx.input.safeSearch]
        : undefined;
      params.strict_match =
        ctx.input.excludeAutocorrect === undefined
          ? undefined
          : ctx.input.excludeAutocorrect
            ? 'on'
            : 'off';
    } else if (engine === 'yandex') {
      params.lang = ctx.input.language;
      params.yandex_domain = ctx.input.searchDomain;
    } else if (engine === 'baidu') {
      params.ct = ctx.input.baiduLanguage;
    } else if (engine === 'naver') {
      params.time_period = ctx.input.timePeriod?.replace('last_', 'past_');
      if (ctx.input.page !== undefined && ctx.input.page > 10) {
        throw createApiServiceError('Naver supports at most 10 result pages.', {
          reason: 'invalid_search_page'
        });
      }
    }
    if (
      ctx.input.num !== undefined &&
      ['bing', 'baidu'].includes(engine) &&
      ctx.input.num > 50
    ) {
      throw createApiServiceError('Bing and Baidu support at most 50 results per page.', {
        reason: 'invalid_search_count'
      });
    }
    let data = await client.search(params);

    let organicResults = resultArray(data.organic_results, 'organic_results').map(
      (r: any) => ({
        position: r.position,
        title: r.title,
        link: r.link,
        snippet: r.snippet,
        source: typeof r.source === 'object' ? r.source?.name : (r.source ?? r.displayed_link),
        date: r.date
      })
    );

    let ads = resultArray(data.ads, 'ads').map((a: any) => ({
      position: a.position,
      title: a.title,
      link: a.link,
      snippet: a.snippet || a.description,
      source: a.source || a.displayed_link
    }));

    let relatedSearches = resultArray(data.related_searches, 'related_searches').map(
      (r: any) => ({
        query: r.query,
        link: r.link
      })
    );

    let resultCount = organicResults.length;

    return {
      output: {
        raw: data,
        searchQuery: data.search_parameters?.q || ctx.input.query,
        totalResults: data.search_information?.total_results,
        timeTaken: data.search_information?.time_taken_displayed,
        organicResults,
        ads: ads.length > 0 ? ads : undefined,
        answerBox: data.answer_box || undefined,
        knowledgeGraph: data.knowledge_graph || undefined,
        relatedSearches: relatedSearches.length > 0 ? relatedSearches : undefined,
        currentPage: data.pagination?.current,
        nextPageLink: data.pagination?.next,
        nextPageToken: data.pagination?.next_page_token
      },
      message: `Found on this page: ${resultCount} organic result${resultCount !== 1 ? 's' : ''} for "${ctx.input.query}"${ctx.input.engine && ctx.input.engine !== 'google' ? ` on ${ctx.input.engine}` : ''}.`
    };
  })
  .build();
