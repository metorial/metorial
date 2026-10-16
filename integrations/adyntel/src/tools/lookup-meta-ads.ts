import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { flattenAds, mapSummary } from '../lib/response';
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

let outputSchema = z.object({
  pageId: z.string().optional(),
  countryCode: z.string().optional(),
  continuationToken: z.string().nullable().optional(),
  platform: z.array(z.string()).optional(),
  isResultComplete: z.boolean().optional(),
  numberOfAds: z.number().optional(),
  countLandingPages: z.number().optional(),
  uniqueLandingPages: z.array(z.string()).optional(),
  results: z.array(metaAdSchema).optional(),
  rawResponse: z
    .unknown()
    .optional()
    .describe('Complete provider response, including original field names and null values')
});

export let lookupMetaAds = SlateTool.create(spec, {
  name: 'Lookup Meta Ads',
  key: 'lookup_meta_ads',
  description: `Retrieve a page of Facebook and Instagram ads for a given company. Look up a company's active Meta ad campaigns by providing either their website domain or Facebook page URL. Returns ad creatives, copy, CTA text, page information, media assets, and platform distribution. Supports pagination via continuation token for large result sets.`,
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
      language: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe(
          'Filter by an English language name or ISO 639-1 code, or a list of languages'
        ),
      checkUgc: z
        .boolean()
        .optional()
        .describe(
          'Classify whether video ads contain user-generated content; requires mediaType video'
        ),
      adType: z
        .enum(['political', 'properties', 'employment', 'financial'])
        .optional()
        .describe('Special ad category; political requires countryCode US'),
      activeStatus: z
        .enum(['inactive', 'all'])
        .optional()
        .describe('Filter by ad status. Defaults to active ads only.')
    })
  )
  .output(outputSchema)
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
      activeStatus: ctx.input.activeStatus,
      language: ctx.input.language,
      checkUgc: ctx.input.checkUgc,
      adType: ctx.input.adType
    });

    let identifier =
      ctx.input.companyDomain || ctx.input.facebookUrl || 'the specified company';
    let adCount = response?.number_of_ads ?? response?.numberOfAds;
    let hasMore = response?.continuation_token || response?.continuationToken;

    return {
      output: mapSummary(outputSchema, {
        pageId: response?.page_id ?? response?.pageId,
        countryCode: response?.country_code ?? response?.countryCode,
        continuationToken:
          response?.continuation_token !== undefined
            ? response.continuation_token
            : response?.continuationToken,
        platform: response?.platform,
        isResultComplete: response?.is_result_complete ?? response?.isResultComplete,
        numberOfAds: typeof adCount === 'number' ? adCount : undefined,
        countLandingPages: response?.count_landing_pages ?? response?.countLandingPages,
        uniqueLandingPages: response?.unique_landing_pages ?? response?.uniqueLandingPages,
        results: flattenAds(response?.results)?.map(ad => {
          let snapshot = mapSummary(metaAdSnapshotSchema, ad.snapshot, {
            ctaText: 'cta_text',
            ctaType: 'cta_type',
            linkUrl: 'link_url',
            pageProfilePictureUrl: 'page_profile_picture_url'
          });
          return mapSummary(
            metaAdSchema,
            {
              ...ad,
              snapshot,
              adArchiveId: ad.adArchiveID !== undefined ? ad.adArchiveID : ad.adArchiveId
            },
            {
              adArchiveId: 'ad_archive_id',
              pageName: 'page_name',
              isActive: 'is_active',
              startDate: 'start_date',
              endDate: 'end_date',
              publisherPlatform: 'publisher_platform'
            }
          );
        }),
        rawResponse: response
      }),
      message: `${typeof adCount === 'number' ? `Found **${adCount}**` : 'Retrieved'} Meta (Facebook/Instagram) ads for **${identifier}**.${hasMore ? ' More results are available using the continuation token.' : ''}`
    };
  })
  .build();
