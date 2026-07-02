import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClearbitClient } from '../lib/client';
import { spec } from '../spec';

let prospectSchema = z.object({
  prospectId: z.string().describe('Clearbit prospect identifier'),
  fullName: z.string().nullable().describe('Full name'),
  givenName: z.string().nullable().describe('First name'),
  familyName: z.string().nullable().describe('Last name'),
  title: z.string().nullable().describe('Job title'),
  role: z.string().nullable().describe('Job role'),
  subRole: z.string().nullable().describe('Job sub-role'),
  seniority: z.string().nullable().describe('Seniority level'),
  companyName: z.string().nullable().describe('Company name'),
  email: z.string().nullable().describe('Email address'),
  phone: z.string().nullable().describe('Phone number'),
  verified: z.boolean().nullable().describe('Whether email is verified')
});

export let findProspects = SlateTool.create(spec, {
  name: 'Find Prospects',
  key: 'find_prospects',
  description: `Search for contacts at a company using its domain name. Filter by role, seniority, title, or location to build targeted outreach lists. Returns names, email addresses, titles, and seniority information for matching contacts.`,
  instructions: [
    'Use **role** and **seniority** together for large companies to narrow results.',
    'For startups/SMBs, try **seniority** alone since roles may not be well-defined.',
    'Use **suppression** set to "eu" to exclude EU contacts for GDPR compliance.'
  ],
  constraints: [
    'Each result returned counts toward your monthly quota.',
    'Maximum 5 pages of results per domain.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domain: z.string().describe('Company domain to search (e.g., "clearbit.com")'),
      role: z
        .string()
        .optional()
        .describe('Filter by role (e.g., "sales", "engineering", "marketing", "leadership")'),
      roles: z.array(z.string()).optional().describe('Filter by multiple roles'),
      seniority: z
        .string()
        .optional()
        .describe('Filter by seniority (e.g., "executive", "director", "manager")'),
      seniorities: z
        .array(z.string())
        .optional()
        .describe('Filter by multiple seniority levels'),
      title: z.string().optional().describe('Filter by exact title'),
      titles: z.array(z.string()).optional().describe('Filter by multiple titles'),
      name: z.string().optional().describe('Filter by first or last name (case-insensitive)'),
      city: z.string().optional().describe('Filter by city'),
      cities: z.array(z.string()).optional().describe('Filter by multiple cities'),
      state: z.string().optional().describe('Filter by state'),
      states: z.array(z.string()).optional().describe('Filter by multiple states'),
      country: z.string().optional().describe('Filter by country'),
      countries: z.array(z.string()).optional().describe('Filter by multiple countries'),
      page: z.number().optional().describe('Page number (starts at 1)'),
      pageSize: z.number().optional().describe('Results per page (default 20)'),
      suppression: z
        .enum(['eu', 'eu_strict'])
        .optional()
        .describe(
          'GDPR suppression: "eu" excludes EU records, "eu_strict" also excludes records with null country'
        )
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total number of matching prospects'),
      page: z.number().describe('Current page number'),
      pageSize: z.number().describe('Results per page'),
      prospects: z.array(prospectSchema).describe('List of matching prospects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClearbitClient({ token: ctx.auth.token });

    let result = await client.searchProspects({
      domain: ctx.input.domain,
      role: ctx.input.role,
      roles: ctx.input.roles,
      seniority: ctx.input.seniority,
      seniorities: ctx.input.seniorities,
      title: ctx.input.title,
      titles: ctx.input.titles,
      name: ctx.input.name,
      city: ctx.input.city,
      cities: ctx.input.cities,
      state: ctx.input.state,
      states: ctx.input.states,
      country: ctx.input.country,
      countries: ctx.input.countries,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize,
      suppression: ctx.input.suppression
    });

    let prospects = result.results.map(p => ({
      prospectId: p.id,
      fullName: p.name?.fullName ?? null,
      givenName: p.name?.givenName ?? null,
      familyName: p.name?.familyName ?? null,
      title: p.title,
      role: p.role,
      subRole: p.subRole,
      seniority: p.seniority,
      companyName: p.company?.name ?? null,
      email: p.email,
      phone: p.phone,
      verified: p.verified
    }));

    return {
      output: {
        total: result.total,
        page: result.page,
        pageSize: result.page_size,
        prospects
      },
      message: `Found **${result.total}** prospects at \`${ctx.input.domain}\`. Showing page ${result.page} with ${prospects.length} results.`
    };
  })
  .build();
