import { SlateTool } from 'slates';
import { z } from 'zod';
import { BigQueryClient } from '../lib/client';
import { spec } from '../spec';

export let listJobs = SlateTool.create(spec, {
  name: 'List Jobs',
  key: 'list_jobs',
  description: `List BigQuery jobs in the project. Jobs include queries, loads, exports, and copy operations. Filter by state, time range, or parent job.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      stateFilter: z
        .enum(['done', 'pending', 'running'])
        .optional()
        .describe('Filter by job state'),
      allUsers: z.boolean().optional().describe('Show jobs from all users in the project'),
      maxResults: z.number().optional().describe('Maximum number of jobs to return'),
      pageToken: z.string().optional().describe('Page token for paginated results'),
      parentJobId: z
        .string()
        .optional()
        .describe('Filter by parent job ID (for scripting jobs)'),
      minCreationTime: z
        .string()
        .optional()
        .describe('Minimum creation time filter (epoch milliseconds)'),
      maxCreationTime: z
        .string()
        .optional()
        .describe('Maximum creation time filter (epoch milliseconds)')
    })
  )
  .output(
    z.object({
      jobs: z.array(
        z.object({
          jobId: z.string(),
          jobType: z.string().optional(),
          state: z.string().optional(),
          creationTime: z.string().optional(),
          startTime: z.string().optional(),
          endTime: z.string().optional(),
          userEmail: z.string().optional(),
          errorResult: z.any().optional(),
          totalBytesProcessed: z.string().optional()
        })
      ),
      nextPageToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new BigQueryClient({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      location: ctx.config.location
    });

    let result = await client.listJobs({
      stateFilter: ctx.input.stateFilter,
      allUsers: ctx.input.allUsers,
      maxResults: ctx.input.maxResults,
      pageToken: ctx.input.pageToken,
      parentJobId: ctx.input.parentJobId,
      minCreationTime: ctx.input.minCreationTime,
      maxCreationTime: ctx.input.maxCreationTime
    });

    let jobs = (result.jobs || []).map((j: any) => ({
      jobId: j.jobReference.jobId,
      jobType: j.configuration
        ? Object.keys(j.configuration).find(
            k => k !== 'labels' && k !== 'dryRun' && k !== 'jobType'
          )
        : undefined,
      state: j.status?.state,
      creationTime: j.statistics?.creationTime,
      startTime: j.statistics?.startTime,
      endTime: j.statistics?.endTime,
      userEmail: j.user_email,
      errorResult: j.status?.errorResult,
      totalBytesProcessed: j.statistics?.totalBytesProcessed
    }));

    return {
      output: {
        jobs,
        nextPageToken: result.nextPageToken
      },
      message: `Found **${jobs.length}** job(s).${result.nextPageToken ? ' More results available.' : ''}`
    };
  })
  .build();

export let getJob = SlateTool.create(spec, {
  name: 'Get Job',
  key: 'get_job',
  description: `Retrieve detailed information about a specific BigQuery job including its configuration, status, and execution statistics.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      jobId: z.string().describe('Job ID to retrieve'),
      location: z
        .string()
        .optional()
        .describe('Job location (overrides the configured default)')
    })
  )
  .output(
    z.object({
      jobId: z.string(),
      projectId: z.string(),
      state: z.string(),
      configuration: z.any().optional(),
      status: z.any(),
      statistics: z.any().optional(),
      userEmail: z.string().optional(),
      creationTime: z.string().optional(),
      startTime: z.string().optional(),
      endTime: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new BigQueryClient({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      location: ctx.config.location
    });

    let job = await client.getJob(ctx.input.jobId, ctx.input.location);

    return {
      output: {
        jobId: job.jobReference.jobId,
        projectId: job.jobReference.projectId,
        state: job.status.state,
        configuration: job.configuration,
        status: job.status,
        statistics: job.statistics,
        userEmail: job.user_email,
        creationTime: job.statistics?.creationTime,
        startTime: job.statistics?.startTime,
        endTime: job.statistics?.endTime
      },
      message: `Job **${ctx.input.jobId}**: state **${job.status.state}**.${job.status.errorResult ? ` Error: ${job.status.errorResult.message}` : ''}`
    };
  })
  .build();

export let cancelJob = SlateTool.create(spec, {
  name: 'Cancel Job',
  key: 'cancel_job',
  description: `Cancel a running BigQuery job. The cancellation is best-effort; the job may still complete before the cancellation takes effect.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      jobId: z.string().describe('Job ID to cancel'),
      location: z
        .string()
        .optional()
        .describe('Job location (overrides the configured default)')
    })
  )
  .output(
    z.object({
      jobId: z.string(),
      state: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new BigQueryClient({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      location: ctx.config.location
    });

    let result = await client.cancelJob(ctx.input.jobId, ctx.input.location);
    let job = result.job;

    return {
      output: {
        jobId: job.jobReference.jobId,
        state: job.status.state
      },
      message: `Cancellation requested for job **${ctx.input.jobId}**. Current state: **${job.status.state}**.`
    };
  })
  .build();
