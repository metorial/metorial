import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let valueFilter = z.object({
  v: z.string().min(1).describe('Value to match.'),
  s: z.enum(['i', 'e']).optional().describe('Include (i) or exclude (e) this value.')
});

let locationFilter = valueFilter.extend({
  b: z.string().min(1).describe('Location bucket returned by Search Locations.')
});

export let searchProspects = SlateTool.create(spec, {
  key: 'search_prospects',
  name: 'Search Prospects',
  description:
    'Find prospects using job, company, location, and technology filters. Returns the total matching count and up to 30 profiles. Use profile URLs with Enrich Contact to find verified contact details.',
  instructions: [
    'Use Search Locations to discover accepted location values and buckets.',
    'Use Search Technologies to discover accepted technology slugs.',
    'Set size to 0 to request only the matching count.'
  ],
  constraints: ['Returning profiles can consume API credits.'],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      filters: z.object({
        first_name: z.array(z.string()).optional().describe('First names to match.'),
        last_name: z.array(z.string()).optional().describe('Last names to match.'),
        job_title: z
          .array(valueFilter)
          .optional()
          .describe('Job titles to include or exclude.'),
        job_title_level: z
          .array(z.string())
          .optional()
          .describe('Seniority levels, such as CXO.'),
        job_role: z.array(z.string()).optional().describe('Job roles, such as finance.'),
        job_company: z.array(valueFilter).optional().describe('Current company names.'),
        company_size: z
          .array(z.string())
          .optional()
          .describe('Company headcount ranges, such as 11-50.'),
        company_industry: z.array(valueFilter).optional().describe('Company industries.'),
        location: z
          .array(locationFilter)
          .optional()
          .describe('Contact locations. Use Search Locations first.'),
        company_location: z
          .array(locationFilter)
          .optional()
          .describe('Company locations. Use Search Locations first.'),
        technologies: z
          .array(valueFilter)
          .optional()
          .describe('Technology slugs. Use Search Technologies first.'),
        linkedin_slug: z
          .array(z.string())
          .optional()
          .describe('LinkedIn profile slugs or URLs.')
      }),
      size: z
        .number()
        .int()
        .min(0)
        .max(30)
        .default(0)
        .describe('Number of profiles to return, from 0 to 30. Defaults to count only.')
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total number of matching prospects.'),
      profiles: z.array(
        z.object({
          fullName: z.string().optional(),
          profileUrl: z
            .string()
            .optional()
            .describe('LinkedIn profile URL to use with Enrich Contact.'),
          industry: z.string().optional(),
          jobTitle: z.string().optional(),
          jobRole: z.string().optional(),
          jobSubRole: z.string().optional(),
          companyName: z.string().optional(),
          companyWebsite: z.string().optional(),
          location: z.string().optional()
        })
      ),
      credits: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Credits charged by Wiza for this search.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.searchProspects({
      filters: pickDefined(ctx.input.filters),
      size: ctx.input.size
    });
    return {
      output: {
        total: result.data.total,
        profiles: (result.data.profiles ?? []).map(profile => ({
          fullName: profile.full_name ?? undefined,
          profileUrl: profile.linkedin_url
            ? profile.linkedin_url.startsWith('http')
              ? profile.linkedin_url
              : `https://${profile.linkedin_url}`
            : undefined,
          industry: profile.industry ?? undefined,
          jobTitle: profile.job_title ?? undefined,
          jobRole: profile.job_title_role ?? undefined,
          jobSubRole: profile.job_title_sub_role ?? undefined,
          companyName: profile.job_company_name ?? undefined,
          companyWebsite: profile.job_company_website ?? undefined,
          location: profile.location_name ?? undefined
        })),
        credits: result.data.credits
      },
      message: `Found ${result.data.total} matching prospects; returned ${result.data.profiles?.length ?? 0} profiles.`
    };
  })
  .build();
