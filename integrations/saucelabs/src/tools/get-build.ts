import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let buildJobSchema = z.object({
  jobId: z.string().describe('Job ID'),
  status: z.string().optional().describe('Job status'),
  passed: z.boolean().nullable().optional().describe('Whether the job passed'),
  name: z.string().nullable().optional().describe('Job name'),
  duration: z.number().optional().describe('Duration in seconds'),
  browser: z.string().optional().describe('Browser name (VDC)'),
  os: z.string().optional().describe('Operating system')
});

export let getBuild = SlateTool.create(spec, {
  name: 'Get Build Details',
  key: 'get_build',
  description: `Retrieve details about a specific build, including its status, job counts, and optionally the list of jobs in the build. Use this to inspect a build's test results.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      buildId: z.string().describe('The unique ID of the build'),
      source: z
        .enum(['vdc', 'rdc'])
        .default('vdc')
        .describe('Device source: vdc (virtual devices) or rdc (real devices)'),
      includeJobs: z
        .boolean()
        .default(false)
        .describe('Whether to include the list of jobs in the build'),
      jobsLimit: z
        .number()
        .optional()
        .describe('Maximum number of jobs to include (if includeJobs is true)')
    })
  )
  .output(
    z.object({
      buildId: z.string().describe('Build identifier'),
      name: z.string().optional().describe('Build name'),
      status: z.string().optional().describe('Build status'),
      startTime: z.string().optional().describe('Build start time'),
      endTime: z.string().optional().describe('Build end time'),
      jobsPassed: z.number().optional().describe('Passed job count'),
      jobsFailed: z.number().optional().describe('Failed job count'),
      jobsErrored: z.number().optional().describe('Errored job count'),
      jobsComplete: z.number().optional().describe('Total completed jobs'),
      jobs: z.array(buildJobSchema).optional().describe('Jobs in the build (if requested)')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let build = await client.getBuild(ctx.input.source, ctx.input.buildId);

    let output: any = {
      buildId: build.id,
      name: build.name,
      status: build.status,
      startTime: build.start_time,
      endTime: build.end_time,
      jobsPassed: build.jobs?.passed,
      jobsFailed: build.jobs?.failed,
      jobsErrored: build.jobs?.errored,
      jobsComplete: build.jobs?.complete
    };

    if (ctx.input.includeJobs) {
      let jobsResult = await client.listBuildJobs(ctx.input.source, ctx.input.buildId, {
        limit: ctx.input.jobsLimit
      });
      let jobsRaw = jobsResult.jobs ?? [];
      output.jobs = jobsRaw.map((j: any) => ({
        jobId: j.id,
        status: j.consolidated_status ?? j.status,
        passed: j.passed,
        name: j.name,
        duration: j.duration,
        browser: j.browser,
        os: j.os
      }));
    }

    return {
      output,
      message: `Build **${build.name ?? build.id}** — status: **${build.status}** (${build.jobs?.passed ?? 0} passed, ${build.jobs?.failed ?? 0} failed)`
    };
  })
  .build();
