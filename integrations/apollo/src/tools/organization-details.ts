import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { apolloServiceError } from '../lib/errors';
import { spec } from '../spec';

let organizationOutputSchema = z.object({
  organizationId: z.string().optional(),
  name: z.string().optional(),
  websiteUrl: z.string().optional(),
  domain: z.string().optional(),
  linkedinUrl: z.string().optional(),
  phone: z.string().optional(),
  industry: z.string().optional(),
  estimatedEmployees: z.number().optional(),
  foundedYear: z.number().optional(),
  annualRevenue: z.number().optional(),
  annualRevenuePrinted: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  shortDescription: z.string().optional(),
  logoUrl: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  technologies: z.array(z.string()).optional()
});

let optionalString = (value: unknown) =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

let optionalNumber = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

let optionalStringArray = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : undefined;

let formatOrganization = (organization: Record<string, any>) => ({
  organizationId: optionalString(organization.id),
  name: optionalString(organization.name),
  websiteUrl: optionalString(organization.website_url),
  domain: optionalString(organization.domain) || optionalString(organization.primary_domain),
  linkedinUrl: optionalString(organization.linkedin_url),
  phone: optionalString(organization.phone),
  industry: optionalString(organization.industry),
  estimatedEmployees: optionalNumber(organization.estimated_num_employees),
  foundedYear: optionalNumber(organization.founded_year),
  annualRevenue: optionalNumber(organization.annual_revenue),
  annualRevenuePrinted: optionalString(organization.annual_revenue_printed),
  city: optionalString(organization.city),
  state: optionalString(organization.state),
  country: optionalString(organization.country),
  shortDescription: optionalString(organization.short_description),
  logoUrl: optionalString(organization.logo_url),
  keywords: optionalStringArray(organization.keywords),
  technologies: optionalStringArray(organization.technology_names)
});

export let getOrganization = SlateTool.create(spec, {
  name: 'Get Organization',
  key: 'get_organization',
  description:
    'Retrieve complete Apollo organization details by organization ID. Use Search Organizations first when you need to discover the organization ID.',
  constraints: ['Requires a master API key', 'Consumes credits according to your Apollo plan'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      organizationId: z.string().describe('Apollo organization ID')
    })
  )
  .output(
    z.object({
      organization: organizationOutputSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });
    let result = await client.getOrganization(ctx.input.organizationId);
    let organization = formatOrganization(result.organization);

    return {
      output: { organization },
      message: `Retrieved organization **${organization.name || organization.organizationId}**.`
    };
  })
  .build();

export let enrichOrganization = SlateTool.create(spec, {
  name: 'Enrich Organization',
  key: 'enrich_organization',
  description:
    'Enrich one organization by domain or up to 10 organizations by domain using Apollo organization enrichment.',
  instructions: [
    'Provide either domain for single enrichment or domains for bulk enrichment.',
    'Do not include www., @, or similar prefixes in domains.'
  ],
  constraints: [
    'Consumes credits according to your Apollo plan',
    'Bulk enrichment accepts up to 10 domains'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domain: z
        .string()
        .optional()
        .describe('Single company domain to enrich, e.g. apollo.io'),
      domains: z
        .array(z.string())
        .optional()
        .describe('Bulk enrichment domains. Provide up to 10 domains.')
    })
  )
  .output(
    z.object({
      organization: organizationOutputSchema.optional(),
      organizations: z.array(organizationOutputSchema).optional()
    })
  )
  .handleInvocation(async ctx => {
    let hasDomain = Boolean(ctx.input.domain);
    let hasDomains = Boolean(ctx.input.domains?.length);

    if (hasDomain === hasDomains) {
      throw apolloServiceError('Provide either domain or domains, but not both.');
    }

    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });

    if (ctx.input.domains?.length) {
      if (ctx.input.domains.length > 10) {
        throw apolloServiceError('Bulk organization enrichment supports up to 10 domains.');
      }

      let result = await client.bulkEnrichOrganizations(ctx.input.domains);
      let organizations = result.organizations.map(formatOrganization);

      return {
        output: { organizations },
        message: `Enriched **${organizations.length}** organization(s).`
      };
    }

    let result = await client.enrichOrganization(ctx.input.domain!);
    if (!result.organization) {
      return {
        output: {},
        message: `No organization enrichment match found for **${ctx.input.domain}**.`
      };
    }

    let organization = formatOrganization(result.organization);
    return {
      output: { organization },
      message: `Enriched organization **${organization.name || ctx.input.domain}**.`
    };
  })
  .build();

export let listOrganizationJobPostings = SlateTool.create(spec, {
  name: 'List Organization Job Postings',
  key: 'list_organization_job_postings',
  description:
    'List current job postings for an Apollo organization ID to identify companies hiring in relevant functions or locations.',
  constraints: [
    'Consumes credits according to your Apollo plan',
    'Display limit is 10,000 records'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      organizationId: z.string().describe('Apollo organization ID'),
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (default: 25)')
    })
  )
  .output(
    z.object({
      jobPostings: z.array(z.record(z.string(), z.any())),
      totalEntries: z.number().optional(),
      currentPage: z.number().optional(),
      totalPages: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });
    let result = await client.listOrganizationJobPostings(ctx.input.organizationId, {
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    return {
      output: {
        jobPostings: result.jobPostings,
        totalEntries: result.pagination?.total_entries,
        currentPage: result.pagination?.page,
        totalPages: result.pagination?.total_pages
      },
      message: `Found **${result.pagination?.total_entries ?? result.jobPostings.length}** job posting(s). Returned ${result.jobPostings.length}.`
    };
  })
  .build();
