import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listJobs = SlateTool.create(spec, {
  name: 'List Jobs',
  key: 'list_jobs',
  description: `Retrieve jobs from your Celigo account. Jobs represent flow execution state (running, completed, failed) and final stats. Returns up to 1,000 results in descending order by creation time.
Filter by flowId, integrationId, status, date ranges, and more.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      flowId: z.string().optional().describe('Filter jobs by flow ID'),
      integrationId: z.string().optional().describe('Filter jobs by integration ID'),
      status: z
        .string()
        .optional()
        .describe('Filter by job status (e.g., running, completed, failed, cancelled)'),
      createdAtFrom: z
        .string()
        .optional()
        .describe('Filter jobs created on or after this time (ISO 8601 UTC)'),
      createdAtTo: z
        .string()
        .optional()
        .describe('Filter jobs created on or before this time (ISO 8601 UTC)')
    })
  )
  .output(
    z.object({
      jobs: z
        .array(
          z.object({
            jobId: z.string().describe('Unique job identifier'),
            type: z.string().optional().describe('Job type'),
            status: z.string().optional().describe('Job status'),
            numSuccess: z.number().optional().describe('Number of successful records'),
            numError: z.number().optional().describe('Number of errored records'),
            numIgnore: z.number().optional().describe('Number of ignored records'),
            startedAt: z.string().optional().describe('Job start time'),
            endedAt: z.string().optional().describe('Job end time'),
            createdAt: z.string().optional().describe('Job creation time'),
            flowId: z.string().optional().describe('Associated flow ID'),
            flowJobId: z.string().optional().describe('Parent flow job ID')
          })
        )
        .describe('List of jobs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let params: Record<string, string> = {};
    if (ctx.input.flowId) params._flowId = ctx.input.flowId;
    if (ctx.input.integrationId) params._integrationId = ctx.input.integrationId;
    if (ctx.input.status) params.status = ctx.input.status;
    if (ctx.input.createdAtFrom) params.createdAt_gte = ctx.input.createdAtFrom;
    if (ctx.input.createdAtTo) params.createdAt_lte = ctx.input.createdAtTo;

    let jobs = await client.listJobs(params);

    let mapped = jobs.map((j: any) => ({
      jobId: j._id,
      type: j.type,
      status: j.status,
      numSuccess: j.numSuccess,
      numError: j.numError,
      numIgnore: j.numIgnore,
      startedAt: j.startedAt,
      endedAt: j.endedAt,
      createdAt: j.createdAt,
      flowId: j._flowId,
      flowJobId: j._flowJobId
    }));

    return {
      output: { jobs: mapped },
      message: `Found **${mapped.length}** job(s).`
    };
  })
  .build();
