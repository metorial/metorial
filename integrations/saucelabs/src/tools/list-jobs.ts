import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let jobSchema = z.object({
  jobId: z.string().describe('Unique job identifier'),
  owner: z.string().optional().describe('Username of job owner'),
  status: z.string().optional().describe('Job status (e.g., complete, passed, failed, error)'),
  passed: z.boolean().nullable().optional().describe('Whether the job passed'),
  name: z.string().nullable().optional().describe('Test name'),
  build: z.string().nullable().optional().describe('Build name'),
  browser: z.string().optional().describe('Browser name'),
  browserVersion: z.string().optional().describe('Browser version'),
  os: z.string().optional().describe('Operating system'),
  automationBackend: z.string().optional().describe('Automation framework used'),
  creationTime: z.number().optional().describe('Job creation time (Unix timestamp)'),
  duration: z.number().optional().describe('Job duration in seconds'),
  tags: z.array(z.string()).optional().describe('Job tags'),
  error: z.string().nullable().optional().describe('Error message if the job errored')
});

export let listJobs = SlateTool.create(spec, {
  name: 'List Test Jobs',
  key: 'list_jobs',
  description: `Retrieve a list of test jobs from Sauce Labs. Supports both Virtual Device Cloud (VDC) and Real Device Cloud (RDC) jobs. Use this to browse recent test results, find jobs by time range, or paginate through job history.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      source: z
        .enum(['vdc', 'rdc'])
        .default('vdc')
        .describe('Device source: vdc (virtual devices/emulators) or rdc (real devices)'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of jobs to return (default varies by source)'),
      skip: z.number().optional().describe('Number of jobs to skip for pagination (VDC only)'),
      offset: z.number().optional().describe('Offset for pagination (RDC only)'),
      from: z
        .number()
        .optional()
        .describe('Only return jobs created after this Unix timestamp (VDC only)'),
      to: z
        .number()
        .optional()
        .describe('Only return jobs created before this Unix timestamp (VDC only)')
    })
  )
  .output(
    z.object({
      jobs: z.array(jobSchema).describe('List of test jobs'),
      totalCount: z
        .number()
        .optional()
        .describe('Total number of jobs matching the query, when provided (RDC only)'),
      moreAvailable: z
        .boolean()
        .optional()
        .describe('Whether more RDC jobs are available after this page')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.source === 'rdc') {
      let result = await client.listRdcJobs({
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });

      let entities = result.entities ?? [];
      let jobs = entities.map((j: any) => ({
        jobId: j.id,
        owner: j.owner_sauce ?? j.owner ?? undefined,
        status: j.consolidated_status ?? j.status ?? undefined,
        passed: j.passed,
        name: j.name,
        build: j.build,
        browser: undefined,
        browserVersion: undefined,
        os: j.os ?? undefined,
        automationBackend: j.automation_backend ?? undefined,
        creationTime: j.creation_time == null ? undefined : j.creation_time / 1000,
        duration:
          j.end_time != null && j.start_time != null
            ? (j.end_time - j.start_time) / 1000
            : undefined,
        tags: j.tags ?? undefined,
        error: j.error
      }));

      return {
        output: {
          jobs,
          totalCount: result.metaData?.totalItemCount,
          moreAvailable: result.metaData?.moreAvailable
        },
        message: `Found **${jobs.length}** real device jobs.`
      };
    }

    let result = await client.listJobs({
      limit: ctx.input.limit,
      skip: ctx.input.skip,
      from: ctx.input.from,
      to: ctx.input.to
    });

    let jobsRaw = Array.isArray(result) ? result : [];
    let jobs = jobsRaw.map((j: any) => ({
      jobId: j.id,
      owner: j.owner ?? undefined,
      status: j.consolidated_status ?? j.status,
      passed: j.passed,
      name: j.name,
      build: j.build,
      browser: j.browser ?? undefined,
      browserVersion: j.browser_version ?? undefined,
      os: j.os ?? undefined,
      automationBackend: j.automation_backend ?? undefined,
      creationTime: j.creation_time ?? undefined,
      duration: j.duration ?? undefined,
      tags: j.tags ?? undefined,
      error: j.error
    }));

    return {
      output: { jobs },
      message: `Found **${jobs.length}** virtual device jobs.`
    };
  })
  .build();
