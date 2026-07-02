import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let locationInfoSchema = z
  .object({
    formattedAddress: z.string().optional(),
    street1: z.string().optional(),
    street2: z.string().optional(),
    city: z.string().optional(),
    areaLevel1: z.string().optional(),
    country: z.string().optional(),
    countryCode2: z.string().optional(),
    countryCode3: z.string().optional(),
    postalCode: z.string().optional()
  })
  .passthrough();

let fundingInfoSchema = z
  .object({
    fundingRounds: z.number().optional().describe('Number of funding rounds'),
    fundingTotalUsd: z.number().optional().describe('Total funding in USD'),
    lastFundingOn: z.string().optional().describe('Date of last funding round'),
    lastFundingType: z.string().optional().describe('Type of last funding round'),
    lastFundingUsd: z.number().optional().describe('Amount of last funding in USD')
  })
  .passthrough();

let technologySchema = z
  .object({
    name: z.string().optional(),
    category: z.string().optional(),
    parentCategory: z.string().optional(),
    categories: z.array(z.string()).optional()
  })
  .passthrough();

let codeSchema = z
  .object({
    code: z.string().optional(),
    description: z.string().optional()
  })
  .passthrough();

let companyResultSchema = z
  .object({
    companyId: z.string().optional().describe('LeadIQ company ID'),
    name: z.string().optional().describe('Company name'),
    alternativeNames: z.array(z.string()).optional().describe('Alternative company names'),
    domain: z.string().optional().describe('Primary domain'),
    description: z.string().optional().describe('Company description'),
    emailDomains: z.array(z.string()).optional().describe('Known email domains'),
    type: z.string().optional().describe('Company type'),
    phones: z.array(z.string()).optional().describe('Company phone numbers'),
    address: z.string().optional().describe('Company address'),
    locationInfo: locationInfoSchema.optional().describe('Detailed location information'),
    logoUrl: z.string().optional().describe('Company logo URL'),
    linkedinId: z.string().optional(),
    linkedinUrl: z.string().optional(),
    numberOfEmployees: z.number().optional().describe('Number of employees'),
    employeeRange: z.string().optional().describe('Employee count range'),
    industry: z.string().optional().describe('Company industry'),
    specialities: z.array(z.string()).optional().describe('Company specialities'),
    fundingInfo: fundingInfoSchema.optional().describe('Funding information'),
    technologies: z.array(technologySchema).optional().describe('Technologies used'),
    revenueRange: z
      .object({
        start: z.number().optional(),
        end: z.number().optional(),
        description: z.string().optional()
      })
      .optional()
      .describe('Revenue range'),
    sicCode: codeSchema.optional().describe('Primary SIC code'),
    secondarySicCodes: z.array(codeSchema).optional().describe('Secondary SIC codes'),
    naicsCode: codeSchema.optional().describe('NAICS code'),
    crunchbaseUrl: z.string().optional(),
    facebookUrl: z.string().optional(),
    twitterUrl: z.string().optional(),
    foundedYear: z.number().optional().describe('Year the company was founded'),
    companyHierarchy: z
      .object({
        isUltimate: z.boolean().optional(),
        parent: z
          .object({ companyId: z.string().optional(), name: z.string().optional() })
          .optional(),
        ultimateParent: z
          .object({ companyId: z.string().optional(), name: z.string().optional() })
          .optional()
      })
      .optional()
      .describe('Company hierarchy (parent/ultimate parent)'),
    updatedDate: z.string().optional().describe('Last updated date')
  })
  .passthrough();

export let searchCompany = SlateTool.create(spec, {
  name: 'Search Company',
  key: 'search_company',
  description: `Look up detailed company information including firmographics, technographics, funding history, and industry classifications.
Search by **company name**, **domain**, or **LinkedIn URL/ID**.
Returns employee counts, revenue range, technologies, funding details, SIC/NAICS codes, location, and company hierarchy.`,
  instructions: [
    'Provide at least one of: name, domain, or LinkedIn URL/ID.',
    'Use strict mode when you need an exact match on the company name or domain.'
  ],
  constraints: ['Each search call consumes API credits.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Company name to search for'),
      domain: z.string().optional().describe('Company domain (e.g., acme.com)'),
      linkedinId: z.string().optional().describe('LinkedIn company ID'),
      linkedinUrl: z.string().optional().describe('LinkedIn company URL'),
      strict: z.boolean().optional().describe('Enable strict matching for name/domain')
    })
  )
  .output(
    z.object({
      totalResults: z.number().optional().describe('Total number of matching results'),
      hasMore: z.boolean().optional().describe('Whether more results are available'),
      results: z.array(companyResultSchema).describe('Matching company records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let input: Record<string, any> = {};
    if (ctx.input.name) input.name = ctx.input.name;
    if (ctx.input.domain) input.domain = ctx.input.domain;
    if (ctx.input.linkedinId) input.linkedinId = ctx.input.linkedinId;
    if (ctx.input.linkedinUrl) input.linkedinUrl = ctx.input.linkedinUrl;
    if (ctx.input.strict !== undefined) input.strict = ctx.input.strict;

    let result = await client.searchCompany(input);

    let results = (result.results ?? []).map((r: any) => ({
      companyId: r.id,
      name: r.name,
      alternativeNames: r.alternativeNames,
      domain: r.domain,
      description: r.description,
      emailDomains: r.emailDomains,
      type: r.type,
      phones: r.phones,
      address: r.address,
      locationInfo: r.locationInfo,
      logoUrl: r.logoUrl,
      linkedinId: r.linkedinId,
      linkedinUrl: r.linkedinUrl,
      numberOfEmployees: r.numberOfEmployees,
      employeeRange: r.employeeRange,
      industry: r.industry,
      specialities: r.specialities,
      fundingInfo: r.fundingInfo,
      technologies: r.technologies,
      revenueRange: r.revenueRange,
      sicCode: r.sicCode,
      secondarySicCodes: r.secondarySicCodes,
      naicsCode: r.naicsCode,
      crunchbaseUrl: r.crunchbaseUrl,
      facebookUrl: r.facebookUrl,
      twitterUrl: r.twitterUrl,
      foundedYear: r.foundedYear,
      companyHierarchy: r.companyHierarchy
        ? {
            isUltimate: r.companyHierarchy.isUltimate,
            parent: r.companyHierarchy.parent
              ? {
                  companyId: r.companyHierarchy.parent.id,
                  name: r.companyHierarchy.parent.name
                }
              : undefined,
            ultimateParent: r.companyHierarchy.ultimateParent
              ? {
                  companyId: r.companyHierarchy.ultimateParent.id,
                  name: r.companyHierarchy.ultimateParent.name
                }
              : undefined
          }
        : undefined,
      updatedDate: r.updatedDate
    }));

    let totalResults = result.totalResults ?? 0;

    return {
      output: {
        totalResults,
        hasMore: result.hasMore ?? false,
        results
      },
      message:
        totalResults > 0
          ? `Found **${totalResults}** matching company/companies. ${results[0]?.name ? `Top match: **${results[0].name}**` : ''}${results[0]?.industry ? ` (${results[0].industry})` : ''}`
          : 'No matching companies found.'
    };
  })
  .build();
