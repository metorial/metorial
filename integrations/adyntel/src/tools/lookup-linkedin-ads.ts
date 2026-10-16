import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { flattenAds, mapSummary } from '../lib/response';
import { spec } from '../spec';

let linkedInAdSchema = z
  .object({
    adId: z.string().optional(),
    creativeType: z.string().optional(),
    type: z.string().optional(),
    advertiser: z
      .object({
        name: z.string().optional(),
        logoUrl: z.string().optional(),
        promoted: z.boolean().optional()
      })
      .passthrough()
      .optional(),
    commentary: z.any().optional(),
    image: z.any().optional(),
    carousel: z.any().optional(),
    headline: z
      .object({
        title: z.string().optional(),
        description: z.string().optional()
      })
      .passthrough()
      .optional(),
    viewDetailsLink: z.string().optional()
  })
  .passthrough();

let outputSchema = z.object({
  pageId: z.string().optional(),
  continuationToken: z.string().nullable().optional(),
  isLastPage: z.boolean().optional(),
  totalAds: z.number().optional(),
  ads: z.array(linkedInAdSchema).optional(),
  rawResponse: z
    .unknown()
    .optional()
    .describe('Complete provider response, including EU transparency fields and null values')
});

export let lookupLinkedInAds = SlateTool.create(spec, {
  name: 'Lookup LinkedIn Ads',
  key: 'lookup_linkedin_ads',
  description: `Retrieve a page of LinkedIn ads for a given company. Fetch ad creatives, impressions, volume data, and ad formats to track any company's paid LinkedIn strategy. Accepts a company domain or LinkedIn Page ID.`,
  instructions: [
    'Provide either a companyDomain or linkedinPageId, not both.',
    'Domains must be in bare format like "tesla.com" without https:// or www. prefix.'
  ],
  constraints: [
    'Each successful API call consumes 1 credit; impressionData costs 2 credits.',
    'Custom date ranges must end before today and span no more than 364 days.'
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
        .describe('Company website domain in bare format, e.g. "salesforce.com"'),
      linkedinPageId: z
        .number()
        .optional()
        .describe(
          'LinkedIn Page ID for the company; use companyDomain when the ID is unknown'
        ),
      continuationToken: z
        .string()
        .optional()
        .describe(
          'Token from a previous Lookup LinkedIn Ads response to retrieve the next page'
        ),
      dateFilter: z
        .enum(['last30d', 'month', 'year', 'lastyear'])
        .optional()
        .describe('Date preset; cannot be combined with custom dates or impressionData'),
      startDate: z
        .string()
        .optional()
        .describe(
          'Custom range start in YYYY-MM-DD; requires endDate, excludes dateFilter and impressionData'
        ),
      endDate: z
        .string()
        .optional()
        .describe(
          'Custom range end in YYYY-MM-DD, before today and at most 364 days after startDate'
        ),
      impressionData: z
        .boolean()
        .optional()
        .describe(
          'Include EU transparency data; costs 2 credits and cannot be combined with date filters'
        )
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      email: ctx.auth.email
    });

    let response = await client.lookupLinkedInAds({
      companyDomain: ctx.input.companyDomain,
      linkedinPageId: ctx.input.linkedinPageId,
      continuationToken: ctx.input.continuationToken,
      dateFilter: ctx.input.dateFilter,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      impressionData: ctx.input.impressionData
    });

    let totalAds = response?.total_ads ?? response?.totalAds;
    let identifier = ctx.input.companyDomain || `LinkedIn page ${ctx.input.linkedinPageId}`;

    return {
      output: mapSummary(outputSchema, {
        pageId: response?.page_id ?? response?.pageId,
        continuationToken:
          response?.continuation_token !== undefined
            ? response.continuation_token
            : response?.continuationToken,
        isLastPage: response?.is_last_page ?? response?.isLastPage,
        totalAds: typeof totalAds === 'number' ? totalAds : undefined,
        ads: flattenAds(response?.ads)?.map(ad => {
          let advertiser = mapSummary(
            linkedInAdSchema.shape.advertiser.unwrap(),
            ad.advertiser,
            { logoUrl: 'logo_url' }
          );
          let headline = mapSummary(linkedInAdSchema.shape.headline.unwrap(), ad.headline);
          return mapSummary(
            linkedInAdSchema,
            { ...ad, advertiser, headline },
            {
              adId: 'ad_id',
              creativeType: 'creative_type',
              viewDetailsLink: 'view_details_link'
            }
          );
        }),
        rawResponse: response
      }),
      message: `${typeof totalAds === 'number' ? `Found **${totalAds}**` : 'Retrieved'} LinkedIn ads for **${identifier}**.`
    };
  })
  .build();
