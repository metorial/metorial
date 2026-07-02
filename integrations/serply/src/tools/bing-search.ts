import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let bingResultSchema = z.object({
  title: z.string().optional().describe('Title of the search result'),
  link: z.string().optional().describe('URL of the search result'),
  description: z.string().optional().describe('Description snippet of the search result'),
  realPosition: z.number().optional().describe('Actual position in the results')
});

let bingAdSchema = z.object({
  title: z.string().optional().describe('Ad title'),
  displayUrl: z.string().optional().describe('Displayed URL'),
  targetUrl: z.string().optional().describe('Target URL'),
  content: z.string().optional().describe('Ad content'),
  position: z.number().optional().describe('Ad position')
});

let bingShoppingAdSchema = z.object({
  title: z.string().optional().describe('Product title'),
  price: z.string().optional().describe('Product price'),
  originalPrice: z.string().optional().describe('Original price before discount'),
  advertiser: z.string().optional().describe('Advertiser name'),
  targetUrl: z.string().optional().describe('Product link'),
  image: z.string().optional().describe('Product image URL')
});

export let bingSearch = SlateTool.create(spec, {
  name: 'Bing Web Search',
  key: 'bing_search',
  description: `Search Bing and retrieve structured web results as JSON. Returns organic results, ads, and shopping ads with titles, links, and descriptions. Useful as an alternative to Google search for comparison or when Bing-specific results are needed.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search query string'),
      num: z.number().optional().describe('Number of results to return'),
      start: z.number().optional().describe('Start offset for pagination'),
      language: z
        .string()
        .optional()
        .describe('Search language filter (e.g., lang_en, lang_es)'),
      interfaceLanguage: z
        .string()
        .optional()
        .describe('Interface language code (e.g., en, es)'),
      proxyLocation: z
        .enum([
          'US',
          'EU',
          'CA',
          'GB',
          'FR',
          'DE',
          'SE',
          'IE',
          'IN',
          'JP',
          'KR',
          'SG',
          'AU',
          'BR'
        ])
        .optional()
        .describe('Geographic location for geo-targeted results, overrides default'),
      deviceType: z
        .enum(['desktop', 'mobile'])
        .optional()
        .describe('Device type for results, overrides default')
    })
  )
  .output(
    z.object({
      results: z.array(bingResultSchema).describe('Organic search results'),
      ads: z.array(bingAdSchema).optional().describe('Text advertisements'),
      adsCount: z.number().optional().describe('Total number of ads'),
      shoppingAds: z.array(bingShoppingAdSchema).optional().describe('Shopping/product ads'),
      location: z.any().optional().describe('Geographic location data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      proxyLocation: ctx.config.proxyLocation,
      deviceType: ctx.config.deviceType
    });

    let data = await client.bingSearch({
      query: ctx.input.query,
      num: ctx.input.num,
      start: ctx.input.start,
      lr: ctx.input.language,
      hl: ctx.input.interfaceLanguage,
      proxyLocation: ctx.input.proxyLocation,
      deviceType: ctx.input.deviceType
    });

    let results = data.results || [];

    return {
      output: {
        results,
        ads: data.ads || [],
        adsCount: data.adsCount || 0,
        shoppingAds: data.shoppingAds || [],
        location: data.location || null
      },
      message: `Found **${results.length}** Bing results for "${ctx.input.query}".`
    };
  })
  .build();
