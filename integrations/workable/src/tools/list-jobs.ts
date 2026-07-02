import { SlateTool } from 'slates';
import { z } from 'zod';
import { WorkableClient } from '../lib/client';
import { spec } from '../spec';

let jobSchema = z.object({
  jobId: z.string().describe('Unique job ID'),
  shortcode: z.string().describe('Job shortcode identifier'),
  title: z.string().describe('Job title'),
  department: z.string().optional().describe('Department name'),
  departmentHierarchy: z
    .array(
      z.object({
        departmentId: z.string().optional(),
        name: z.string().optional()
      })
    )
    .optional()
    .describe('Department hierarchy'),
  location: z
    .object({
      city: z.string().optional(),
      region: z.string().optional(),
      country: z.string().optional(),
      countryCode: z.string().optional(),
      telecommuting: z.boolean().optional()
    })
    .optional()
    .describe('Job location'),
  state: z.string().describe('Job state (draft, published, closed, archived)'),
  url: z.string().optional().describe('Public URL for the job posting'),
  applicationUrl: z.string().optional().describe('Application URL'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let listJobsTool = SlateTool.create(spec, {
  name: 'List Jobs',
  key: 'list_jobs',
  description: `List job postings from Workable. Filter by state (draft, published, closed, archived) or by date. Use this to browse open positions, find job shortcodes for candidate operations, or audit job statuses.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      state: z
        .enum(['draft', 'published', 'closed', 'archived'])
        .optional()
        .describe('Filter jobs by state'),
      limit: z.number().optional().describe('Maximum number of jobs to return (default 50)'),
      sinceId: z.string().optional().describe('Return jobs after this job ID for pagination'),
      createdAfter: z
        .string()
        .optional()
        .describe('ISO 8601 date — only return jobs created after this date'),
      updatedAfter: z
        .string()
        .optional()
        .describe('ISO 8601 date — only return jobs updated after this date')
    })
  )
  .output(
    z.object({
      jobs: z.array(jobSchema).describe('List of jobs'),
      paging: z
        .object({
          next: z.string().optional().describe('URL for the next page of results')
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new WorkableClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let result = await client.listJobs({
      state: ctx.input.state,
      limit: ctx.input.limit,
      since_id: ctx.input.sinceId,
      created_after: ctx.input.createdAfter,
      updated_after: ctx.input.updatedAfter
    });

    let jobs = (result.jobs || []).map((j: any) => ({
      jobId: j.id,
      shortcode: j.shortcode,
      title: j.title,
      department: j.department,
      departmentHierarchy: j.department_hierarchy?.map((d: any) => ({
        departmentId: d.id,
        name: d.name
      })),
      location: j.location
        ? {
            city: j.location.city,
            region: j.location.region,
            country: j.location.country,
            countryCode: j.location.country_code,
            telecommuting: j.location.telecommuting
          }
        : undefined,
      state: j.state,
      url: j.url,
      applicationUrl: j.application_url,
      createdAt: j.created_at,
      updatedAt: j.updated_at
    }));

    return {
      output: {
        jobs,
        paging: result.paging
      },
      message: `Found **${jobs.length}** job(s)${ctx.input.state ? ` with state "${ctx.input.state}"` : ''}.`
    };
  })
  .build();
