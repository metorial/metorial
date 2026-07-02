import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let metaAdSnapshotSchema = z
  .object({
    body: z
      .object({
        text: z.string().optional()
      })
      .optional(),
    cards: z.array(z.any()).optional(),
    ctaText: z.string().optional(),
    ctaType: z.string().optional(),
    linkUrl: z.string().optional(),
    pageProfilePictureUrl: z.string().optional()
  })
  .passthrough();

let metaAdSchema = z
  .object({
    adArchiveId: z.string().optional(),
    pageName: z.string().optional(),
    isActive: z.boolean().optional(),
    startDate: z.number().optional(),
    endDate: z.number().nullable().optional(),
    publisherPlatform: z.array(z.string()).optional(),
    snapshot: metaAdSnapshotSchema.optional()
  })
  .passthrough();

export let lookupMetaAds = SlateTool.create(spec, {
  name: 'Lookup Meta Ads',
  key: 'lookup_meta_ads',
  description: `Retrieve all Facebook and Instagram ads for a given company. Look up a company's active Meta ad campaigns by providing either their website domain or Facebook page URL. Returns ad creatives, copy, CTA text, page information, media assets, and platform distribution. Supports pagination via continuation token for large result sets.`,
  instructions: [
    'Provide either a companyDomain or facebookUrl, not both.',
    'Domains must be in bare format like "tesla.com" without https:// or www. prefix.'
  ],
  constraints: [
    'Each successful API call consumes 1 credit.',
    'A 204 response (empty result) is returned if the domain is invalid, has no Facebook page, or the page is not publicly accessible.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      companyDomain: z
        .string()
        .optional()
        .describe('Company website domain in bare format, e.g. "tesla.com"'),
      facebookUrl: z
        .string()
        .optional()
        .describe('Full Facebook page URL starting with https://'),
      continuationToken: z
        .string()
        .optional()
        .describe('Token for retrieving additional ad batches from a previous response'),
      mediaType: z
        .enum(['image', 'meme', 'image_and_meme', 'video'])
        .optional()
        .describe('Filter ads by media type'),
      countryCode: z
        .string()
        .optional()
        .describe('ISO 3166-1 alpha-2 country code to filter results, e.g. "US", "GB"'),
      activeStatus: z
        .enum(['inactive', 'all'])
        .optional()
        .describe('Filter by ad status. Defaults to active ads only.')
    })
  )
  .output(
    z.object({
      pageId: z.string().optional(),
      countryCode: z.string().optional(),
      continuationToken: z.string().nullable().optional(),
      platform: z.array(z.string()).optional(),
      isResultComplete: z.boolean().optional(),
      numberOfAds: z.number().optional(),
      countLandingPages: z.number().optional(),
      uniqueLandingPages: z.array(z.string()).optional(),
      results: z.array(metaAdSchema).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      email: ctx.auth.email
    });

    let response = await client.lookupMetaAds({
      companyDomain: ctx.input.companyDomain,
      facebookUrl: ctx.input.facebookUrl,
      continuationToken: ctx.input.continuationToken,
      mediaType: ctx.input.mediaType,
      countryCode: ctx.input.countryCode,
      activeStatus: ctx.input.activeStatus
    });

    let identifier =
      ctx.input.companyDomain || ctx.input.facebookUrl || 'the specified company';
    let adCount = response?.number_of_ads ?? response?.numberOfAds ?? 0;
    let hasMore = response?.continuation_token || response?.continuationToken;

    return {
      output: {
        pageId: response?.page_id ?? response?.pageId,
        countryCode: response?.country_code ?? response?.countryCode,
        continuationToken: response?.continuation_token ?? response?.continuationToken,
        platform: response?.platform,
        isResultComplete: response?.is_result_complete ?? response?.isResultComplete,
        numberOfAds: adCount,
        countLandingPages: response?.count_landing_pages ?? response?.countLandingPages,
        uniqueLandingPages: response?.unique_landing_pages ?? response?.uniqueLandingPages,
        results: response?.results
      },
      message: `Found **${adCount}** Meta (Facebook/Instagram) ads for **${identifier}**.${hasMore ? ' More results are available using the continuation token.' : ''}`
    };
  })
  .build();
