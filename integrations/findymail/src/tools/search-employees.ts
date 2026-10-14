import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { FindymailClient } from '../lib/client';
import { spec } from '../spec';

export let searchEmployees = SlateTool.create(spec, {
  name: 'Search Employees',
  key: 'search_employees',
  description: `Find employees at a company by website and job title. Returns LinkedIn profiles matching the specified criteria.`,
  constraints: ['Uses 1 credit per contact found.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      website: z.string().describe('Company website domain, e.g. "stripe.com".'),
      jobTitles: z
        .array(z.string())
        .describe('Up to 10 job titles to search for, e.g. ["CEO", "CTO", "VP of Sales"].'),
      count: z
        .number()
        .optional()
        .describe('Maximum employees to return, 1 to 5. Defaults to 1.')
    })
  )
  .output(
    z.object({
      employees: z
        .array(
          z.object({
            name: z.string().optional().describe('Employee full name.'),
            linkedinUrl: z.string().optional().describe('LinkedIn profile URL.'),
            jobTitle: z.string().optional().describe('Job title.'),
            companyName: z.string().optional().describe('Employer company name.'),
            companyWebsite: z.string().optional().describe('Employer website.')
          })
        )
        .describe('List of matching employees.'),
      totalFound: z.number().describe('Total number of employees found.')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.jobTitles.length < 1 || ctx.input.jobTitles.length > 10) {
      throw createApiServiceError('Provide between 1 and 10 job titles.');
    }
    if (
      ctx.input.count !== undefined &&
      (!Number.isInteger(ctx.input.count) || ctx.input.count < 1 || ctx.input.count > 5)
    ) {
      throw createApiServiceError('count must be an integer between 1 and 5.');
    }
    let client = new FindymailClient({ token: ctx.auth.token });

    let result = await client.searchEmployees({
      website: ctx.input.website,
      jobTitles: ctx.input.jobTitles,
      count: ctx.input.count
    });

    let employees = Array.isArray(result) ? result : (result?.employees ?? result?.data ?? []);
    let mapped = employees.map((e: any) => ({
      name: e?.name ?? undefined,
      linkedinUrl: e?.linkedinUrl ?? e?.linkedin_url ?? undefined,
      jobTitle: e?.jobTitle ?? e?.job_title ?? undefined,
      companyName: e?.companyName ?? undefined,
      companyWebsite: e?.companyWebsite ?? undefined
    }));

    return {
      output: {
        employees: mapped,
        totalFound: mapped.length
      },
      message:
        mapped.length > 0
          ? `Found **${mapped.length}** employee(s) at **${ctx.input.website}**.`
          : `No employees found matching the criteria at **${ctx.input.website}**.`
    };
  })
  .build();
