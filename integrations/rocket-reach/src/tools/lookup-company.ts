import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let lookupCompany = SlateTool.create(spec, {
  name: 'Lookup Company',
  key: 'lookup_company',
  description: `Retrieve detailed firmographic data for a company including industry, size, revenue, social links, technographics, funding history, and key team members. Identify the company using its domain, name, or LinkedIn URL.

Use this for **company enrichment** — get comprehensive metadata about any business.`,
  instructions: [
    'Provide at least one identifier: domain, name, or linkedinUrl.',
    'Domain lookup (e.g., "tesla.com") is the most reliable method.',
    'Company lookups do not return employee contact information — use Search People to find contacts at a company.'
  ],
  constraints: [
    'Company enrichment may consume Company Export credits. Check Get Account and your plan access before running it; usage and lookup history cannot be rolled back by these tools.'
  ],
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      domain: z
        .string()
        .optional()
        .describe('Company website domain (e.g., "tesla.com"). Most reliable lookup method.'),
      name: z.string().optional().describe('Company name to look up'),
      linkedinUrl: z.string().optional().describe('Company LinkedIn URL')
    })
  )
  .output(
    z.object({
      companyId: z.number().optional().describe('RocketReach internal company ID'),
      name: z.string().nullable().optional().describe('Company name'),
      domain: z.string().nullable().optional().describe('Primary email domain'),
      websiteUrl: z.string().nullable().optional().describe('Company website URL'),
      tickerSymbol: z.string().nullable().optional().describe('Stock ticker symbol'),
      industry: z.string().nullable().optional().describe('Industry classification'),
      employeeCount: z.number().nullable().optional().describe('Number of employees'),
      revenue: z.string().nullable().optional().describe('Revenue range or value'),
      city: z.string().nullable().optional().describe('City'),
      region: z.string().nullable().optional().describe('Region or state'),
      countryCode: z.string().nullable().optional().describe('Country code'),
      description: z.string().nullable().optional().describe('Company description'),
      founded: z.number().nullable().optional().describe('Year founded'),
      linkedinUrl: z.string().nullable().optional().describe('Company LinkedIn URL'),
      facebookUrl: z.string().nullable().optional().describe('Company Facebook URL'),
      twitterUrl: z.string().nullable().optional().describe('Company Twitter URL'),
      crunchbaseUrl: z.string().nullable().optional().describe('Crunchbase URL'),
      phone: z.string().nullable().optional().describe('Company phone number'),
      fax: z.string().nullable().optional().describe('Company fax number'),
      totalFunding: z.number().nullable().optional().describe('Total funding raised'),
      latestFundingRound: z
        .string()
        .nullable()
        .optional()
        .describe('Latest funding round type'),
      latestFundingDate: z
        .string()
        .nullable()
        .optional()
        .describe('Date of the latest funding round'),
      techstack: z
        .array(z.string())
        .nullable()
        .optional()
        .describe('Technologies used by the company'),
      naicsCode: z.string().nullable().optional().describe('NAICS industry code'),
      sicCode: z.string().nullable().optional().describe('SIC industry code')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.lookupCompany({
      domain: ctx.input.domain,
      name: ctx.input.name,
      linkedinUrl: ctx.input.linkedinUrl
    });

    let output = {
      companyId: result.id,
      name: result.name,
      domain: result.email_domain ?? result.domain,
      websiteUrl: result.website_url,
      tickerSymbol: result.ticker_symbol,
      industry:
        result.industry_str ??
        (typeof result.industry === 'string' ? result.industry : undefined),
      employeeCount: result.num_employees ?? result.employee_count,
      revenue: result.revenue,
      city: result.city,
      region: result.region,
      countryCode: result.country_code,
      description: result.description,
      founded: result.founded ?? result.year_founded,
      linkedinUrl:
        result.linkedin_url ??
        (typeof result.links?.linkedin === 'string' ? result.links.linkedin : undefined),
      facebookUrl:
        result.facebook_url ??
        (typeof result.links?.facebook === 'string' ? result.links.facebook : undefined),
      twitterUrl:
        result.twitter_url ??
        (typeof result.links?.twitter === 'string' ? result.links.twitter : undefined),
      crunchbaseUrl:
        result.crunchbase_url ??
        (typeof result.links?.crunchbase === 'string' ? result.links.crunchbase : undefined),
      phone: result.phone,
      fax: result.fax,
      totalFunding: result.total_funding,
      latestFundingRound: result.latest_funding_round,
      latestFundingDate: result.latest_funding_date,
      techstack: result.techstack,
      naicsCode: result.naics_code,
      sicCode: result.sic_code
    };

    return {
      output,
      message: `Retrieved firmographic data for **${result.name || result.email_domain || result.domain || 'the requested company'}**${result.industry_str ? ` (${result.industry_str})` : ''}.`
    };
  })
  .build();
