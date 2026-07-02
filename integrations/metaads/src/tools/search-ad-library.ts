import { SlateTool } from 'slates';
import { z } from 'zod';
import { MetaAdsClient } from '../lib/client';
import { spec } from '../spec';

export let searchAdLibrary = SlateTool.create(spec, {
  name: 'Search Ad Library',
  key: 'search_ad_library',
  description: `Search Meta's public Ad Library for ads running across Facebook, Instagram, Messenger, and WhatsApp. Useful for competitive research and market analysis. Returns publicly available ad data including creative text, page info, and estimated reach.

**Note:** The Ad Library does not provide private performance KPIs. Spend and impressions are broad ranges, not precise figures.`,
  constraints: [
    'Requires additional Ad Library API approval.',
    'Does not return exact performance metrics (CTR, conversions, etc.).',
    'Spend and impressions are provided as ranges.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      searchTerms: z.string().optional().describe('Keywords to search for in ad content'),
      adReachedCountries: z
        .array(z.string())
        .min(1)
        .describe('ISO country codes for where ads were shown (e.g., ["US", "GB"])'),
      adType: z
        .enum(['ALL', 'POLITICAL_AND_ISSUE_ADS'])
        .optional()
        .describe('Type of ads to search for'),
      adActiveStatus: z
        .enum(['ALL', 'ACTIVE', 'INACTIVE'])
        .optional()
        .describe('Filter by active status'),
      searchPageIds: z
        .array(z.string())
        .optional()
        .describe('Filter by specific Facebook Page IDs'),
      limit: z.number().optional().describe('Max number of results to return'),
      afterCursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      ads: z.array(
        z.object({
          adLibraryId: z.string().optional().describe('Ad Library ID'),
          adCreationTime: z.string().optional().describe('When the ad was created'),
          adDeliveryStartTime: z.string().optional().describe('When ad delivery started'),
          adDeliveryStopTime: z.string().optional().describe('When ad delivery stopped'),
          adCreativeBodies: z.array(z.string()).optional().describe('Ad body text variations'),
          adCreativeLinkCaptions: z
            .array(z.string())
            .optional()
            .describe('Link caption variations'),
          adCreativeLinkTitles: z
            .array(z.string())
            .optional()
            .describe('Link title variations'),
          pageId: z.string().optional().describe('Facebook Page ID'),
          pageName: z.string().optional().describe('Facebook Page name'),
          publisherPlatforms: z
            .array(z.string())
            .optional()
            .describe('Platforms where the ad runs'),
          estimatedAudienceSize: z.any().optional().describe('Estimated audience size range'),
          spend: z.any().optional().describe('Spend range'),
          impressions: z.any().optional().describe('Impressions range')
        })
      ),
      nextCursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MetaAdsClient({
      token: ctx.auth.token,
      adAccountId: ctx.config.adAccountId,
      apiVersion: ctx.config.apiVersion
    });

    let result = await client.searchAdLibrary({
      searchTerms: ctx.input.searchTerms,
      adReachedCountries: ctx.input.adReachedCountries,
      adType: ctx.input.adType,
      adActiveStatus: ctx.input.adActiveStatus,
      searchPageIds: ctx.input.searchPageIds,
      limit: ctx.input.limit,
      after: ctx.input.afterCursor
    });

    let ads = (result.data || []).map((a: any) => ({
      adLibraryId: a.id,
      adCreationTime: a.ad_creation_time,
      adDeliveryStartTime: a.ad_delivery_start_time,
      adDeliveryStopTime: a.ad_delivery_stop_time,
      adCreativeBodies: a.ad_creative_bodies,
      adCreativeLinkCaptions: a.ad_creative_link_captions,
      adCreativeLinkTitles: a.ad_creative_link_titles,
      pageId: a.page_id,
      pageName: a.page_name,
      publisherPlatforms: a.publisher_platforms,
      estimatedAudienceSize: a.estimated_audience_size,
      spend: a.spend,
      impressions: a.impressions
    }));

    return {
      output: {
        ads,
        nextCursor: result.paging?.cursors?.after
      },
      message: `Found **${ads.length}** ads in the Ad Library.`
    };
  })
  .build();
