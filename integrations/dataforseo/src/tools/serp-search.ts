import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let serpItemSchema = z
  .object({
    type: z
      .string()
      .optional()
      .describe('Type of SERP element (e.g., organic, featured_snippet, local_pack)'),
    rankGroup: z.number().optional().describe('Position in the SERP group'),
    rankAbsolute: z.number().optional().describe('Absolute position in the SERP'),
    domain: z.string().optional().describe('Domain of the result'),
    title: z.string().optional().describe('Title of the result'),
    url: z.string().optional().describe('URL of the result'),
    description: z.string().optional().describe('Snippet/description text'),
    breadcrumb: z.string().optional().describe('Breadcrumb trail')
  })
  .passthrough();

export let serpSearch = SlateTool.create(spec, {
  name: 'SERP Search',
  key: 'serp_search',
  description: `Retrieve Google search engine results pages (SERPs) for any keyword. Returns organic results, featured snippets, local packs, knowledge graphs, and other SERP features with their rankings, URLs, and descriptions. Useful for competitive analysis, rank tracking, and understanding search landscape for specific queries.`,
  instructions: [
    'Provide a keyword to search for. Optionally specify search engine, location, language, device type, and number of results.',
    'Location can be specified by name (e.g., "United States") or code. Language can be specified by name (e.g., "English") or code.',
    'Google is used by default. Bing, Yahoo, and YouTube organic live advanced results are also supported.',
    'The depth parameter controls how many results to retrieve (multiples of 10, e.g., 10, 20, 30, up to 700).'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      searchEngine: z
        .enum(['google', 'bing', 'yahoo', 'youtube'])
        .default('google')
        .describe('Organic SERP search engine to query. Defaults to Google.'),
      keyword: z.string().describe('Search keyword or phrase to look up'),
      locationName: z
        .string()
        .optional()
        .describe(
          'Full name of the search location (e.g., "United States", "London,England,United Kingdom")'
        ),
      locationCode: z
        .number()
        .optional()
        .describe('DataForSEO location code (e.g., 2840 for United States)'),
      languageName: z
        .string()
        .optional()
        .describe('Full name of the search language (e.g., "English")'),
      languageCode: z.string().optional().describe('Language code (e.g., "en")'),
      device: z.enum(['desktop', 'mobile']).optional().describe('Device type for the search'),
      os: z
        .enum(['windows', 'macos'])
        .optional()
        .describe('Operating system for desktop searches'),
      depth: z
        .number()
        .optional()
        .describe('Number of results to retrieve (multiples of 10, max 700)')
    })
  )
  .output(
    z.object({
      keyword: z.string().describe('The searched keyword'),
      searchEngine: z.string().describe('Search engine used'),
      locationName: z.string().optional().describe('Location of the search'),
      languageName: z.string().optional().describe('Language of the search'),
      totalResults: z
        .number()
        .optional()
        .describe('Total number of search results reported by Google'),
      itemsCount: z.number().optional().describe('Number of items returned'),
      items: z.array(serpItemSchema).describe('SERP result items'),
      cost: z.number().optional().describe('API cost for this request')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.serpOrganicLive({
      searchEngine: ctx.input.searchEngine,
      keyword: ctx.input.keyword,
      locationName: ctx.input.locationName,
      locationCode: ctx.input.locationCode,
      languageName: ctx.input.languageName,
      languageCode: ctx.input.languageCode,
      device: ctx.input.device,
      os: ctx.input.os,
      depth: ctx.input.depth
    });

    let result = client.extractFirstResult(response);
    let items = (result?.items ?? []).map((item: any) => ({
      type: item.type,
      rankGroup: item.rank_group,
      rankAbsolute: item.rank_absolute,
      domain: item.domain,
      title: item.title ?? item.name ?? item.channel_name,
      url: item.url,
      description: item.description,
      breadcrumb: item.breadcrumb
    }));

    return {
      output: {
        keyword: ctx.input.keyword,
        searchEngine: ctx.input.searchEngine,
        locationName: result?.check_url ? undefined : ctx.input.locationName,
        languageName: ctx.input.languageName,
        totalResults: result?.se_results_count,
        itemsCount: result?.items_count,
        items,
        cost: response.cost
      },
      message: `Found **${items.length}** ${ctx.input.searchEngine} SERP results for keyword **"${ctx.input.keyword}"**${ctx.input.locationName ? ` in ${ctx.input.locationName}` : ''}.`
    };
  })
  .build();
