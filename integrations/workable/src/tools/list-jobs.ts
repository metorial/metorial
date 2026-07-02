import { SlateTool } from 'slates';
import { z } from 'zod';
import { WorkableClient } from '../lib/client';
import { mapJob } from '../lib/shapes';
import { spec } from '../spec';

let jobSchema = z.object({
  jobId: z.string().describe('Unique job ID'),
  shortcode: z.string().describe('Job shortcode identifier'),
  code: z.string().optional().describe('Job code'),
  title: z.string().describe('Job title'),
  fullTitle: z.string().optional().describe('Full job title'),
  department: z.string().optional().describe('Department name'),
  departmentId: z.union([z.string(), z.number()]).optional().describe('Department ID'),
  departmentHierarchy: z
    .array(
      z.object({
        departmentId: z.union([z.string(), z.number()]).optional(),
        name: z.string().optional()
      })
    )
    .optional()
    .describe('Department hierarchy'),
  location: z
    .object({
      city: z.string().optional(),
      region: z.string().optional(),
      regionCode: z.string().optional(),
      country: z.string().optional(),
      countryCode: z.string().optional(),
      zipCode: z.string().optional(),
      locationStr: z.string().optional(),
      telecommuting: z.boolean().optional()
    })
    .optional()
    .describe('Primary job location'),
  locations: z.array(z.any()).optional().describe('Additional job locations'),
  workplaceType: z.string().optional().describe('Workplace type'),
  state: z.string().describe('Job state'),
  confidential: z.boolean().optional().describe('Whether the job is confidential'),
  url: z.string().optional().describe('Public URL for the job posting'),
  shortlink: z.string().optional().describe('Short public URL'),
  applicationUrl: z.string().optional().describe('Application URL'),
  salary: z
    .object({
      salaryFrom: z.number().optional(),
      salaryTo: z.number().optional(),
      currency: z.string().optional()
    })
    .optional()
    .describe('Salary range'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let listJobsTool = SlateTool.create(spec, {
  name: 'List Jobs',
  key: 'list_jobs',
  description: `List Workable jobs. Filter by state or date, and use the returned shortcode with candidate, application form, question, and stage tools.`,
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
      limit: z.number().optional().describe('Maximum number of jobs to return (max 100)'),
      sinceId: z.string().optional().describe('Return jobs with ID greater than this ID'),
      maxId: z.string().optional().describe('Return jobs with ID less than this ID'),
      createdAfter: z
        .string()
        .optional()
        .describe('ISO 8601 date; only return jobs created after this date'),
      updatedAfter: z
        .string()
        .optional()
        .describe('ISO 8601 date; only return jobs updated after this date'),
      includeFields: z
        .string()
        .optional()
        .describe('Comma-separated extra fields supported by Workable')
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
      max_id: ctx.input.maxId,
      created_after: ctx.input.createdAfter,
      updated_after: ctx.input.updatedAfter,
      include_fields: ctx.input.includeFields
    });

    let jobs = (result.jobs || []).map(mapJob);

    return {
      output: {
        jobs,
        paging: result.paging
      },
      message: `Found **${jobs.length}** job(s)${ctx.input.state ? ` with state "${ctx.input.state}"` : ''}.`
    };
  })
  .build();
