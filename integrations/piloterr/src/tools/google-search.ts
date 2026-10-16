import { SlateTool } from 'slates';
import { z } from 'zod';
import { PiloterrClient } from '../lib/client';
import { normalizeOutput } from '../lib/response';
import { spec } from '../spec';

let googleSearchOutputSchema = z.object({
  raw: z.any().describe('Full provider response'),
  organicResults: z.array(z.any()).optional().describe('Organic search results'),
  knowledgeGraph: z.any().optional().describe('Knowledge graph panel (web search)'),
  relatedSearches: z.array(z.any()).optional().describe('Related search suggestions'),
  searchInformation: z
    .any()
    .optional()
    .describe('Search metadata like total results and time taken'),
  pagination: z.any().optional().describe('Pagination information'),
  searchParameters: z.any().optional().describe('Provider search parameters'),
  images: z.array(z.any()).optional().describe('Image results (images search type)'),
  suggestions: z.array(z.any()).optional().describe('Search suggestions')
});

export let googleSearch = SlateTool.create(spec, {
  name: 'Google Search',
  key: 'google_search',
  description: `Search Google and retrieve structured results including organic results, knowledge graph, related searches, and pagination info. Supports multiple search types: web, news, images, and videos.`,
  instructions: [
    'Use the "tbs" parameter for time-based filtering, e.g., "qdr:d" for past day, "qdr:w" for past week.',
    'Set "gl" for country code (e.g., "us", "fr") and "hl" for language code (e.g., "en", "fr") to localize results.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search query string'),
      searchType: z
        .enum(['web', 'news', 'images', 'videos'])
        .default('web')
        .describe('Type of Google search to perform'),
      location: z
        .string()
        .optional()
        .describe('Geographic location for localized web, news, or video results'),
      uule: z
        .string()
        .optional()
        .describe('Google-encoded location for web, news, or video search'),
      safe: z
        .enum(['active', 'off'])
        .optional()
        .describe('SafeSearch filter for web, images, or videos; omit to use Google default'),
      countryCode: z
        .string()
        .optional()
        .describe('Two-letter country code (e.g., "us", "fr")'),
      languageCode: z
        .string()
        .optional()
        .describe('Two-letter language code (e.g., "en", "fr")'),
      tbs: z
        .string()
        .optional()
        .describe(
          'Time-based search filter (e.g., "qdr:d" for past day, "qdr:w" for past week)'
        ),
      page: z.number().optional().describe('Page number for pagination'),
      resultsPerPage: z
        .number()
        .optional()
        .describe(
          'Requested results per page. Deprecated and unreliable for web search; images return batches of 100'
        )
    })
  )
  .output(googleSearchOutputSchema)
  .handleInvocation(async ctx => {
    let client = new PiloterrClient(ctx.auth.token);
    let result: any;

    if (ctx.input.searchType === 'news') {
      result = await client.googleNews({
        query: ctx.input.query,
        location: ctx.input.location,
        uule: ctx.input.uule,
        gl: ctx.input.countryCode,
        hl: ctx.input.languageCode,
        page: ctx.input.page,
        num: ctx.input.resultsPerPage
      });
    } else if (ctx.input.searchType === 'images') {
      result = await client.googleImages({
        query: ctx.input.query,
        gl: ctx.input.countryCode,
        safe: ctx.input.safe,
        hl: ctx.input.languageCode,
        page: ctx.input.page
      });
    } else if (ctx.input.searchType === 'videos') {
      result = await client.googleVideos({
        query: ctx.input.query,
        location: ctx.input.location,
        uule: ctx.input.uule,
        gl: ctx.input.countryCode,
        safe: ctx.input.safe,
        hl: ctx.input.languageCode,
        page: ctx.input.page,
        num: ctx.input.resultsPerPage
      });
    } else {
      result = await client.googleSearch({
        query: ctx.input.query,
        tbs: ctx.input.tbs,
        location: ctx.input.location,
        uule: ctx.input.uule,
        gl: ctx.input.countryCode,
        safe: ctx.input.safe,
        hl: ctx.input.languageCode,
        page: ctx.input.page,
        num: ctx.input.resultsPerPage
      });
    }

    return {
      output: normalizeOutput(googleSearchOutputSchema, {
        raw: result,
        organicResults: result.organic_results,
        knowledgeGraph: result.knowledge_graph,
        relatedSearches: result.related_searches,
        searchInformation: result.search_information,
        pagination: result.pagination,
        searchParameters: result.search_parameters,
        images: result.images,
        suggestions: result.suggestions
      }),
      message: `Google ${ctx.input.searchType} search for **"${ctx.input.query}"** completed.`
    };
  })
  .build();
