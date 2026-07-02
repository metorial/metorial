import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let metaSearchResultSchema = z
  .object({
    adArchiveID: z.string().optional(),
    pageName: z.string().optional(),
    pageID: z.string().optional(),
    isActive: z.boolean().optional(),
    startDate: z.number().optional(),
    endDate: z.number().nullable().optional(),
    publisherPlatform: z.array(z.string()).optional(),
    snapshot: z.any().optional(),
    pageLikeCount: z.number().optional()
  })
  .passthrough();

export let searchMetaAds = SlateTool.create(spec, {
  name: 'Search Meta Ads',
  key: 'search_meta_ads',
  description: `Search the Meta Ad Library by keyword. Find Facebook and Instagram ads matching a search term, with optional geographic filtering by country. Returns ad creatives, page information, and platform distribution for matching ads.`,
  instructions: ['Country codes use ISO 3166-1 alpha-2 format (e.g. "US", "GB", "DE").'],
  constraints: ['Each successful API call consumes 1 credit.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      keyword: z.string().describe('Keyword to search for in the Meta Ad Library'),
      countryCode: z
        .string()
        .optional()
        .describe('ISO 3166-1 alpha-2 country code to limit results, e.g. "US"')
    })
  )
  .output(
    z.object({
      query: z.string().optional(),
      activeStatus: z.string().optional(),
      adType: z.string().optional(),
      continuationToken: z.string().nullable().optional(),
      countryCode: z.string().optional(),
      isResultComplete: z.boolean().optional(),
      mediaTypes: z.string().optional(),
      numberOfAds: z.number().optional(),
      platform: z.array(z.string()).optional(),
      results: z.array(metaSearchResultSchema).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      email: ctx.auth.email
    });

    let response = await client.searchMetaAds({
      keyword: ctx.input.keyword,
      countryCode: ctx.input.countryCode
    });

    let adCount = response?.number_of_ads ?? response?.numberOfAds ?? 0;
    let countryStr = ctx.input.countryCode ? ` in **${ctx.input.countryCode}**` : '';

    return {
      output: {
        query: response?.query,
        activeStatus: response?.active_status ?? response?.activeStatus,
        adType: response?.ad_type ?? response?.adType,
        continuationToken: response?.continuation_token ?? response?.continuationToken,
        countryCode: response?.country_code ?? response?.countryCode,
        isResultComplete: response?.is_result_complete ?? response?.isResultComplete,
        mediaTypes: response?.media_types ?? response?.mediaTypes,
        numberOfAds: adCount,
        platform: response?.platform,
        results: response?.results
      },
      message: `Found **${adCount}** Meta ads matching keyword **"${ctx.input.keyword}"**${countryStr}.`
    };
  })
  .build();
