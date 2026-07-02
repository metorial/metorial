import { SlateTool } from 'slates';
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
        .describe('List of job titles to search for, e.g. ["CEO", "CTO", "VP of Sales"].'),
      count: z.number().optional().describe('Maximum number of employees to return.')
    })
  )
  .output(
    z.object({
      employees: z
        .array(
          z.object({
            name: z.string().optional().describe('Employee full name.'),
            linkedinUrl: z.string().optional().describe('LinkedIn profile URL.'),
            jobTitle: z.string().optional().describe('Job title.')
          })
        )
        .describe('List of matching employees.'),
      totalFound: z.number().describe('Total number of employees found.')
    })
  )
  .handleInvocation(async ctx => {
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
      jobTitle: e?.jobTitle ?? e?.job_title ?? undefined
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
