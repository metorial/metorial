import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageJob = SlateTool.create(spec, {
  name: 'Manage Job',
  key: 'manage_job',
  description: `Get job details, run a job, or list recent job runs. Jobs can be manual or cron-scheduled, and support runtime environment overrides per run.`,
  instructions: [
    'Use action "get" to retrieve job configuration and status.',
    'Use action "run" to trigger a job execution, optionally overriding environment variables.',
    'Use action "list_runs" to see recent run history for a job.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['get', 'run', 'list_runs']).describe('Operation to perform'),
      projectId: z.string().describe('Project ID the job belongs to'),
      jobId: z.string().describe('Job ID'),
      runtimeEnvironment: z
        .record(z.string(), z.string())
        .optional()
        .describe('Environment variable overrides for a job run'),
      page: z.number().optional().describe('Page number for list_runs pagination'),
      perPage: z.number().optional().describe('Results per page for list_runs (max 100)')
    })
  )
  .output(
    z.object({
      jobId: z.string().optional().describe('Job ID'),
      name: z.string().optional().describe('Job name'),
      jobType: z.string().optional().describe('Job type: manual or cron'),
      runId: z.string().optional().describe('Run ID (when a job is triggered)'),
      runs: z
        .array(
          z.object({
            runId: z.string().describe('Run ID'),
            status: z.string().optional().describe('Run status'),
            createdAt: z.string().optional().describe('Run creation timestamp')
          })
        )
        .optional()
        .describe('List of recent job runs'),
      hasNextPage: z.boolean().optional().describe('Whether more run results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      teamId: ctx.config.teamId
    });

    let { action, projectId, jobId } = ctx.input;

    if (action === 'get') {
      let result = await client.getJob(projectId, jobId);
      return {
        output: {
          jobId: result?.id,
          name: result?.name,
          jobType: result?.jobType
        },
        message: `Job **${result?.name}** — type: ${result?.jobType}.`
      };
    }

    if (action === 'run') {
      let overrides: any = {};
      if (ctx.input.runtimeEnvironment) {
        overrides.runtimeEnvironment = ctx.input.runtimeEnvironment;
      }
      let result = await client.runJob(projectId, jobId, overrides);
      return {
        output: {
          jobId,
          runId: result?.id || result?.runId
        },
        message: `Job **${jobId}** triggered successfully.`
      };
    }

    if (action === 'list_runs') {
      let result = await client.listJobRuns(projectId, jobId, {
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
      let runs = (result.data?.runs || []).map((r: any) => ({
        runId: r.id,
        status: r.status,
        createdAt: r.createdAt
      }));
      return {
        output: {
          jobId,
          runs,
          hasNextPage: result.pagination.hasNextPage
        },
        message: `Found **${runs.length}** run(s) for job **${jobId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
