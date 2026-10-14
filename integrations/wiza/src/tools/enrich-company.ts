import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let enrichCompany = SlateTool.create(spec, {
  name: 'Enrich Company',
  key: 'enrich_company',
  description: `Retrieve detailed company information including industry, headcount, revenue, funding, founding year, headquarters location, and social media profiles.

Provide at least one identifier: company name, domain, LinkedIn ID, or LinkedIn slug.`,
  constraints: [
    'Rate limit: 30 requests per minute, 43,200 requests per day.',
    'Costs 2 API credits per successful request.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      companyName: z.string().optional().describe('Name of the company (e.g., "Wiza").'),
      companyDomain: z
        .string()
        .optional()
        .describe('Company website domain (e.g., "wiza.co").'),
      companyLinkedinId: z.string().optional().describe('LinkedIn company ID (numeric).'),
      companyLinkedinSlug: z
        .string()
        .optional()
        .describe('LinkedIn company URL slug (e.g., "wiza" from linkedin.com/company/wiza).')
    })
  )
  .output(
    z.object({
      companyName: z.string().optional().describe('Company name.'),
      companyDomain: z.string().optional().describe('Company website domain.'),
      companyLinkedin: z.string().optional().describe('Company LinkedIn URL.'),
      companyLinkedinId: z.string().optional().describe('LinkedIn company ID.'),
      companyIndustry: z.string().optional().describe('Primary industry.'),
      companySubindustry: z.string().optional().describe('Sub-industry.'),
      companySize: z.number().optional().describe('Employee headcount.'),
      companySizeRange: z.string().optional().describe('Headcount range (e.g., "51-200").'),
      companyType: z.string().optional().describe('Company type (e.g., "public", "private").'),
      companyDescription: z.string().optional().describe('Company description.'),
      companyFounded: z.number().optional().describe('Founding year.'),
      companyRevenue: z.string().optional().describe('Revenue range.'),
      companyFunding: z.string().optional().describe('Total funding amount.'),
      companyLastFundingRound: z.string().optional().describe('Last funding round type.'),
      companyTicker: z.string().optional().describe('Stock ticker symbol.'),
      companyLocation: z.string().optional().describe('Headquarters location.'),
      companyStreet: z.string().optional().describe('Street address.'),
      companyLocality: z.string().optional().describe('City.'),
      companyRegion: z.string().optional().describe('State or region.'),
      companyPostalCode: z.string().optional().describe('Postal code.'),
      companyCountry: z.string().optional().describe('Country.'),
      twitterUrl: z.string().optional().describe('Twitter profile URL.'),
      facebookUrl: z.string().optional().describe('Facebook page URL.'),
      linkedinUrl: z.string().optional().describe('LinkedIn company page URL.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.enrichCompany({
      companyName: ctx.input.companyName,
      companyDomain: ctx.input.companyDomain,
      companyLinkedinId: ctx.input.companyLinkedinId,
      companyLinkedinSlug: ctx.input.companyLinkedinSlug
    });

    let d = result.data;

    ctx.info({ message: 'Company enrichment completed', companyName: d.company_name });

    let output = {
      companyName: d.company_name ?? undefined,
      companyDomain: d.company_domain ?? undefined,
      companyLinkedin: d.company_linkedin ?? undefined,
      companyLinkedinId: d.company_linkedin_id ?? undefined,
      companyIndustry: d.company_industry ?? undefined,
      companySubindustry: d.company_subindustry ?? undefined,
      companySize: d.company_size ?? undefined,
      companySizeRange: d.company_size_range ?? undefined,
      companyType: d.company_type ?? undefined,
      companyDescription: d.company_description ?? undefined,
      companyFounded: d.company_founded ?? undefined,
      companyRevenue:
        d.company_revenue_range ??
        (d.company_revenue == null ? undefined : String(d.company_revenue)),
      companyFunding: d.company_funding == null ? undefined : String(d.company_funding),
      companyLastFundingRound: d.company_last_funding_round ?? undefined,
      companyTicker: d.company_ticker ?? undefined,
      companyLocation: d.company_location ?? undefined,
      companyStreet: d.company_street ?? undefined,
      companyLocality: d.company_locality ?? undefined,
      companyRegion: d.company_region ?? undefined,
      companyPostalCode: d.company_postal_code ?? undefined,
      companyCountry: d.company_country ?? undefined,
      twitterUrl: d.company_twitter ?? d.twitter_url ?? undefined,
      facebookUrl: d.company_facebook ?? d.facebook_url ?? undefined,
      linkedinUrl: d.company_linkedin ?? d.linkedin_url ?? undefined
    };

    let parts = [
      `Company enrichment completed for **${d.company_name || 'unknown company'}**`
    ];
    if (d.company_domain) parts.push(`Domain: ${d.company_domain}`);
    if (d.company_industry) parts.push(`Industry: ${d.company_industry}`);
    if (d.company_size_range) parts.push(`Size: ${d.company_size_range} employees`);
    if (d.company_location) parts.push(`HQ: ${d.company_location}`);

    return {
      output,
      message: parts.join('\n')
    };
  })
  .build();
