import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClearbitClient } from '../lib/client';
import { spec } from '../spec';

let companyGeoSchema = z
  .object({
    streetNumber: z.string().nullable(),
    streetName: z.string().nullable(),
    subPremise: z.string().nullable(),
    city: z.string().nullable(),
    postalCode: z.string().nullable(),
    state: z.string().nullable(),
    stateCode: z.string().nullable(),
    country: z.string().nullable(),
    countryCode: z.string().nullable(),
    lat: z.number().nullable(),
    lng: z.number().nullable()
  })
  .nullable();

let categorySchema = z
  .object({
    sector: z.string().nullable().describe('GICS sector'),
    industryGroup: z.string().nullable().describe('GICS industry group'),
    industry: z.string().nullable().describe('GICS industry'),
    subIndustry: z.string().nullable().describe('GICS sub-industry'),
    sicCode: z.string().nullable().describe('SIC code'),
    naicsCode: z.string().nullable().describe('NAICS code')
  })
  .nullable();

let metricsSchema = z
  .object({
    alexaUsRank: z.number().nullable().describe('Alexa US rank'),
    alexaGlobalRank: z.number().nullable().describe('Alexa global rank'),
    employees: z.number().nullable().describe('Estimated number of employees'),
    employeesRange: z.string().nullable().describe('Employee count range'),
    marketCap: z.number().nullable().describe('Market capitalization'),
    raised: z.number().nullable().describe('Total funding raised'),
    annualRevenue: z.number().nullable().describe('Annual revenue'),
    estimatedAnnualRevenue: z.string().nullable().describe('Estimated annual revenue range'),
    fiscalYearEnd: z.number().nullable().describe('Fiscal year end month')
  })
  .nullable();

export let enrichCompany = SlateTool.create(spec, {
  name: 'Enrich Company',
  key: 'enrich_company',
  description: `Look up detailed firmographic information about a company using its domain name. Returns company name, industry, employee count, location, funding, tech stack, social profiles, and more. Use for account enrichment, lead qualification, or market research.`,
  instructions: [
    'Uses the streaming API for synchronous results. Returns a 404 error if the company is not found.'
  ],
  constraints: [
    'Rate limited to 600 requests per minute.',
    'Not all fields are guaranteed to return a value.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domain: z.string().describe('Company website domain (e.g., "clearbit.com")')
    })
  )
  .output(
    z.object({
      companyId: z.string().describe('Clearbit company identifier'),
      name: z.string().nullable().describe('Company name'),
      legalName: z.string().nullable().describe('Legal name'),
      domain: z.string().nullable().describe('Primary domain'),
      domainAliases: z.array(z.string()).nullable().describe('Alternate domains'),
      description: z.string().nullable().describe('Company description'),
      url: z.string().nullable().describe('Company website URL'),
      logo: z.string().nullable().describe('Logo URL'),
      type: z
        .string()
        .nullable()
        .describe(
          'Company type (Private, Public, Education, Government, Nonprofit, Personal)'
        ),
      tags: z.array(z.string()).nullable().describe('Clearbit tags'),
      tech: z.array(z.string()).nullable().describe('Technologies used'),
      phone: z.string().nullable().describe('Company phone number'),
      foundedYear: z.number().nullable().describe('Year founded'),
      location: z.string().nullable().describe('Location string'),
      geo: companyGeoSchema,
      category: categorySchema,
      metrics: metricsSchema,
      ticker: z.string().nullable().describe('Stock ticker symbol'),
      emailProvider: z
        .boolean()
        .nullable()
        .describe('Whether domain is a free email provider'),
      facebookHandle: z.string().nullable().describe('Facebook handle'),
      twitterHandle: z.string().nullable().describe('Twitter handle'),
      linkedinHandle: z.string().nullable().describe('LinkedIn handle'),
      crunchbaseHandle: z.string().nullable().describe('Crunchbase handle'),
      parentDomain: z.string().nullable().describe('Parent company domain'),
      indexedAt: z.string().nullable().describe('When the record was last refreshed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClearbitClient({ token: ctx.auth.token });

    let company = await client.findCompany({ domain: ctx.input.domain });

    let output = {
      companyId: company.id,
      name: company.name,
      legalName: company.legalName,
      domain: company.domain,
      domainAliases: company.domainAliases,
      description: company.description,
      url: company.url,
      logo: company.logo,
      type: company.type,
      tags: company.tags,
      tech: company.tech,
      phone: company.phone,
      foundedYear: company.foundedYear,
      location: company.location,
      geo: company.geo,
      category: company.category,
      metrics: company.metrics,
      ticker: company.ticker,
      emailProvider: company.emailProvider,
      facebookHandle: company.facebook?.handle ?? null,
      twitterHandle: company.twitter?.handle ?? null,
      linkedinHandle: company.linkedin?.handle ?? null,
      crunchbaseHandle: company.crunchbase?.handle ?? null,
      parentDomain: company.parent?.domain ?? null,
      indexedAt: company.indexedAt
    };

    let namePart = output.name ? ` **${output.name}**` : '';
    let industryPart = output.category?.industry ? ` in ${output.category.industry}` : '';
    let sizePart = output.metrics?.employeesRange
      ? ` (${output.metrics.employeesRange} employees)`
      : '';

    return {
      output,
      message: `Found company${namePart}${industryPart}${sizePart}.`
    };
  })
  .build();
