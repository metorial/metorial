import { SlateTool } from 'slates';
import { z } from 'zod';
import { DatabricksClient } from '../lib/client';
import { databricksServiceError } from '../lib/errors';
import { spec } from '../spec';

export let listJobs = SlateTool.create(spec, {
  name: 'List Jobs',
  key: 'list_jobs',
  description: `List jobs defined in the workspace. Optionally filter by name and expand task details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Filter by job name (substring match)'),
      limit: z.number().optional().describe('Maximum number of jobs to return (default 20)'),
      pageToken: z
        .string()
        .optional()
        .describe('Pagination token from nextPageToken or prevPageToken'),
      offset: z
        .number()
        .optional()
        .describe('Deprecated: Jobs API 2.2 uses pageToken instead of offset'),
      expandTasks: z
        .boolean()
        .optional()
        .describe('Include full task definitions in the response')
    })
  )
  .output(
    z.object({
      jobs: z
        .array(
          z.object({
            jobId: z.string().describe('Unique job identifier'),
            name: z.string().describe('Job name'),
            creatorUserName: z.string().optional().describe('User who created the job'),
            createdTime: z.string().optional().describe('Job creation time in epoch ms'),
            taskCount: z.number().optional().describe('Number of tasks in the job'),
            schedule: z.string().optional().describe('Cron schedule expression if scheduled'),
            tags: z.record(z.string(), z.string()).optional().describe('Job tags')
          })
        )
        .describe('List of jobs'),
      hasMore: z.boolean().describe('Whether more results are available'),
      nextPageToken: z.string().optional().describe('Token for the next page of jobs'),
      prevPageToken: z.string().optional().describe('Token for the previous page of jobs')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.offset !== undefined) {
      throw databricksServiceError('offset is not supported by Jobs API 2.2; use pageToken');
    }

    let client = new DatabricksClient({
      workspaceUrl: ctx.config.workspaceUrl,
      token: ctx.auth.token
    });

    let result = await client.listJobs({
      name: ctx.input.name,
      limit: ctx.input.limit,
      pageToken: ctx.input.pageToken,
      expandTasks: ctx.input.expandTasks
    });

    let jobs = (result.jobs ?? []).map((j: any) => ({
      jobId: String(j.job_id),
      name: j.settings?.name ?? '',
      creatorUserName: j.creator_user_name,
      createdTime: j.created_time ? String(j.created_time) : undefined,
      taskCount: j.settings?.tasks?.length,
      schedule: j.settings?.schedule?.quartz_cron_expression,
      tags: j.settings?.tags
    }));

    return {
      output: {
        jobs,
        hasMore: Boolean(result.next_page_token),
        nextPageToken: result.next_page_token,
        prevPageToken: result.prev_page_token
      },
      message: `Found **${jobs.length}** job(s).${result.next_page_token ? ' More results available.' : ''}`
    };
  })
  .build();
