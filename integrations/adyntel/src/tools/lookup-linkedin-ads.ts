import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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

export let lookupLinkedInAds = SlateTool.create(spec, {
  name: 'Lookup LinkedIn Ads',
  key: 'lookup_linkedin_ads',
  description: `Retrieve all LinkedIn ads for a given company. Fetch ad creatives, impressions, volume data, and ad formats to track any company's paid LinkedIn strategy. Accepts a company domain or LinkedIn Page ID.`,
  instructions: [
    'Provide either a companyDomain or linkedinPageId, not both.',
    'Domains must be in bare format like "tesla.com" without https:// or www. prefix.'
  ],
  constraints: ['Each successful API call consumes 1 credit.'],
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
      linkedinPageId: z.number().optional().describe('LinkedIn Page ID for the company')
    })
  )
  .output(
    z.object({
      pageId: z.string().optional(),
      continuationToken: z.string().nullable().optional(),
      isLastPage: z.boolean().optional(),
      totalAds: z.number().optional(),
      ads: z.array(linkedInAdSchema).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      email: ctx.auth.email
    });

    let response = await client.lookupLinkedInAds({
      companyDomain: ctx.input.companyDomain,
      linkedinPageId: ctx.input.linkedinPageId
    });

    let totalAds = response?.total_ads ?? response?.totalAds ?? 0;
    let identifier = ctx.input.companyDomain || `LinkedIn page ${ctx.input.linkedinPageId}`;

    return {
      output: {
        pageId: response?.page_id ?? response?.pageId,
        continuationToken: response?.continuation_token ?? response?.continuationToken,
        isLastPage: response?.is_last_page ?? response?.isLastPage,
        totalAds: totalAds,
        ads: response?.ads
      },
      message: `Found **${totalAds}** LinkedIn ads for **${identifier}**.`
    };
  })
  .build();
