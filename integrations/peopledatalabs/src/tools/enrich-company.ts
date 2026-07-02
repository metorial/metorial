import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let companyOutputSchema = z.object({
  companyId: z
    .string()
    .nullable()
    .optional()
    .describe('Unique PDL identifier for this company'),
  name: z.string().nullable().optional(),
  displayName: z.string().nullable().optional(),
  size: z.string().nullable().optional().describe('Employee count range'),
  employeeCount: z.number().nullable().optional(),
  founded: z.number().nullable().optional(),
  industry: z.string().nullable().optional(),
  naicsCode: z.string().nullable().optional(),
  sicCode: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  websiteUrl: z.string().nullable().optional(),
  linkedinUrl: z.string().nullable().optional(),
  linkedinId: z.string().nullable().optional(),
  facebookUrl: z.string().nullable().optional(),
  twitterUrl: z.string().nullable().optional(),
  ticker: z.string().nullable().optional(),
  type: z
    .string()
    .nullable()
    .optional()
    .describe('Company type (e.g. public, private, nonprofit)'),
  locationName: z.string().nullable().optional(),
  locationLocality: z.string().nullable().optional(),
  locationRegion: z.string().nullable().optional(),
  locationCountry: z.string().nullable().optional(),
  locationContinent: z.string().nullable().optional(),
  locationStreetAddress: z.string().nullable().optional(),
  locationPostalCode: z.string().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  alternativeNames: z.array(z.string()).nullable().optional(),
  alternativeDomains: z.array(z.string()).nullable().optional(),
  totalFundingRaised: z.number().nullable().optional(),
  latestFundingStage: z.string().nullable().optional(),
  lastFundedAt: z.string().nullable().optional(),
  numberOfFundingRounds: z.number().nullable().optional(),
  averageEmployeeTenure: z.number().nullable().optional(),
  averageTenureByRole: z.any().nullable().optional(),
  averageTenureByLevel: z.any().nullable().optional(),
  employeeGrowthRate: z.any().nullable().optional(),
  grossAdditionsByMonth: z.any().nullable().optional(),
  grossDeparturesByMonth: z.any().nullable().optional(),
  topNextEmployers: z.any().nullable().optional(),
  topPreviousEmployers: z.any().nullable().optional()
});

export let enrichCompany = SlateTool.create(spec, {
  name: 'Enrich Company',
  key: 'enrich_company',
  description: `Enrich data on a company by matching against the company dataset. Provide a company name, website, LinkedIn URL, or ticker symbol to find a matching company profile.
Returns comprehensive company information including size, industry, location, funding, and employee insights.`,
  instructions: [
    'Provide at least one identifying parameter (name, website, LinkedIn URL, or ticker).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Company name (e.g. "Google")'),
      website: z.string().optional().describe('Company website URL (e.g. "google.com")'),
      linkedinUrl: z.string().optional().describe('Company LinkedIn profile URL'),
      ticker: z.string().optional().describe('Stock ticker symbol (e.g. "GOOGL")'),
      location: z.string().optional().describe('Company headquarters location'),
      locality: z.string().optional().describe('City/locality of the company'),
      region: z.string().optional().describe('State/region of the company'),
      country: z.string().optional().describe('Country of the company'),
      streetAddress: z.string().optional().describe('Street address of the company'),
      postalCode: z.string().optional().describe('Postal/zip code of the company'),
      titlecase: z.boolean().optional().describe('Titlecase the output fields')
    })
  )
  .output(companyOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      sandbox: ctx.config.sandbox
    });

    let params: Record<string, unknown> = {};
    if (ctx.input.name) params.name = ctx.input.name;
    if (ctx.input.website) params.website = ctx.input.website;
    if (ctx.input.linkedinUrl) params.profile = ctx.input.linkedinUrl;
    if (ctx.input.ticker) params.ticker = ctx.input.ticker;
    if (ctx.input.location) params.location = ctx.input.location;
    if (ctx.input.locality) params.locality = ctx.input.locality;
    if (ctx.input.region) params.region = ctx.input.region;
    if (ctx.input.country) params.country = ctx.input.country;
    if (ctx.input.streetAddress) params.street_address = ctx.input.streetAddress;
    if (ctx.input.postalCode) params.postal_code = ctx.input.postalCode;
    if (ctx.input.titlecase !== undefined) params.titlecase = ctx.input.titlecase;

    let result = await client.enrichCompany(params);
    let data = result;

    let output = mapCompanyData(data);

    return {
      output,
      message: output.name
        ? `Found company: **${output.displayName || output.name}**${output.industry ? ` (${output.industry})` : ''}${output.size ? ` - ${output.size} employees` : ''}`
        : 'No matching company found for the provided parameters.'
    };
  })
  .build();

export let mapCompanyData = (data: any) => {
  return {
    companyId: data.id ?? null,
    name: data.name ?? null,
    displayName: data.display_name ?? null,
    size: data.size ?? null,
    employeeCount: data.employee_count ?? null,
    founded: data.founded ?? null,
    industry: data.industry ?? null,
    naicsCode: data.naics?.[0]?.naics_code ?? null,
    sicCode: data.sic?.[0]?.sic_code ?? null,
    description: data.summary ?? null,
    websiteUrl: data.website ?? null,
    linkedinUrl: data.linkedin_url ?? null,
    linkedinId: data.linkedin_id ?? null,
    facebookUrl: data.facebook_url ?? null,
    twitterUrl: data.twitter_url ?? null,
    ticker: data.ticker ?? null,
    type: data.type ?? null,
    locationName: data.location?.name ?? null,
    locationLocality: data.location?.locality ?? null,
    locationRegion: data.location?.region ?? null,
    locationCountry: data.location?.country ?? null,
    locationContinent: data.location?.continent ?? null,
    locationStreetAddress: data.location?.street_address ?? null,
    locationPostalCode: data.location?.postal_code ?? null,
    tags: data.tags ?? null,
    alternativeNames: data.alternative_names ?? null,
    alternativeDomains: data.alternative_domains ?? null,
    totalFundingRaised: data.total_funding_raised ?? null,
    latestFundingStage: data.latest_funding_stage ?? null,
    lastFundedAt: data.last_funded_at ?? null,
    numberOfFundingRounds: data.number_of_funding_rounds ?? null,
    averageEmployeeTenure: data.average_employee_tenure ?? null,
    averageTenureByRole: data.average_tenure_by_role ?? null,
    averageTenureByLevel: data.average_tenure_by_level ?? null,
    employeeGrowthRate: data.employee_growth_rate ?? null,
    grossAdditionsByMonth: data.gross_additions_by_month ?? null,
    grossDeparturesByMonth: data.gross_departures_by_month ?? null,
    topNextEmployers: data.top_next_employers_by_role ?? null,
    topPreviousEmployers: data.top_previous_employers_by_role ?? null
  };
};
