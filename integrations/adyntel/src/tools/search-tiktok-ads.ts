import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let tiktokSearchResultSchema = z
  .object({
    auditStatus: z.string().optional(),
    estimatedAudience: z.string().optional(),
    firstShownDate: z.number().optional(),
    adId: z.string().optional(),
    imageUrls: z.array(z.string()).optional(),
    impression: z.number().optional(),
    lastShownDate: z.number().optional(),
    name: z.string().optional(),
    showMode: z.number().optional(),
    spent: z.string().optional(),
    type: z.number().optional(),
    videos: z
      .array(
        z
          .object({
            coverImg: z.string().optional(),
            videoUrl: z.string().optional()
          })
          .passthrough()
      )
      .optional()
  })
  .passthrough();

export let searchTikTokAds = SlateTool.create(spec, {
  name: 'Search TikTok Ads',
  key: 'search_tiktok_ads',
  description: `Search for ads on TikTok by keyword. Find TikTok advertising campaigns matching a search term, with optional geographic filtering. Returns ad metadata including estimated audience size, date ranges, impression data, and media assets (images and videos).`,
  instructions: [
    'Use the adId from the results to fetch detailed ad information with the "Get TikTok Ad Details" tool.',
    'Country codes use ISO 3166-1 alpha-2 format. Supported codes include EU/EEA countries (AT, BE, BG, CH, CY, CZ, DE, DK, EE, ES, FI, FR, GB, GR, HR, HU, IE, IS, IT, LI, LT, LU, LV, MT, NL, NO, PL, PT, RO, SE, SI, SK) or "ALL" for all countries.'
  ],
  constraints: ['Each successful API call consumes 1 credit.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      keyword: z.string().describe('Keyword to search for TikTok ads'),
      countryCode: z
        .string()
        .optional()
        .describe(
          'ISO 3166-1 alpha-2 country code to filter results, e.g. "DE", or "ALL" for all countries'
        )
    })
  )
  .output(
    z.object({
      code: z.number().optional(),
      total: z.number().optional(),
      hasMore: z.boolean().optional(),
      searchId: z.string().optional(),
      ads: z.array(tiktokSearchResultSchema).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      email: ctx.auth.email
    });

    let response = await client.searchTikTokAds({
      keyword: ctx.input.keyword,
      countryCode: ctx.input.countryCode
    });

    let total = response?.total ?? 0;
    let ads = (response?.data ?? []).map((ad: any) => ({
      auditStatus: ad?.audit_status ?? ad?.auditStatus,
      estimatedAudience: ad?.estimated_audience ?? ad?.estimatedAudience,
      firstShownDate: ad?.first_shown_date ?? ad?.firstShownDate,
      adId: ad?.id ? String(ad.id) : undefined,
      imageUrls: ad?.image_urls ?? ad?.imageUrls,
      impression: ad?.impression,
      lastShownDate: ad?.last_shown_date ?? ad?.lastShownDate,
      name: ad?.name,
      showMode: ad?.show_mode ?? ad?.showMode,
      spent: ad?.spent,
      type: ad?.type,
      videos: ad?.videos?.map((v: any) => ({
        coverImg: v?.cover_img ?? v?.coverImg,
        videoUrl: v?.video_url ?? v?.videoUrl
      }))
    }));

    let countryStr = ctx.input.countryCode ? ` in **${ctx.input.countryCode}**` : '';

    return {
      output: {
        code: response?.code,
        total,
        hasMore: response?.has_more ?? response?.hasMore,
        searchId: response?.search_id ?? response?.searchId,
        ads
      },
      message: `Found **${total}** TikTok ads matching keyword **"${ctx.input.keyword}"**${countryStr}.`
    };
  })
  .build();
