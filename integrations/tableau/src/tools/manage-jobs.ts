import { SlateTool } from 'slates';
import { z } from 'zod';
import { tableauServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageJobs = SlateTool.create(spec, {
  name: 'Manage Jobs',
  key: 'manage_jobs',
  description: `List, get details, or cancel background jobs (extract refreshes, flow runs, subscriptions). Use the **action** field to select the operation.`
})
  .input(
    z.object({
      action: z.enum(['list', 'get', 'cancel']).describe('Operation to perform'),
      jobId: z.string().optional().describe('Job LUID (required for get, cancel)'),
      pageSize: z.number().optional().describe('Page size for list'),
      pageNumber: z.number().optional().describe('Page number for list'),
      filter: z
        .string()
        .optional()
        .describe('Filter expression for list (e.g., "jobType:eq:refresh_extracts")')
    })
  )
  .output(
    z.object({
      jobs: z
        .array(
          z.object({
            jobId: z.string(),
            jobType: z.string().optional(),
            status: z.string().optional(),
            createdAt: z.string().optional(),
            startedAt: z.string().optional(),
            endedAt: z.string().optional(),
            progress: z.number().optional(),
            title: z.string().optional()
          })
        )
        .optional(),
      job: z
        .object({
          jobId: z.string(),
          jobType: z.string().optional(),
          status: z.string().optional(),
          createdAt: z.string().optional(),
          startedAt: z.string().optional(),
          endedAt: z.string().optional(),
          progress: z.number().optional(),
          title: z.string().optional(),
          finishCode: z.number().optional()
        })
        .optional(),
      totalCount: z.number().optional(),
      cancelled: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let { action } = ctx.input;

    if (action === 'list') {
      let result = await client.queryJobs({
        pageSize: ctx.input.pageSize,
        pageNumber: ctx.input.pageNumber,
        filter: ctx.input.filter
      });

      let pagination = result.pagination || {};
      let jobs = (result.backgroundJobs?.backgroundJob || []).map((j: any) => ({
        jobId: j.id,
        jobType: j.jobType,
        status: j.status,
        createdAt: j.createdAt,
        startedAt: j.startedAt,
        endedAt: j.endedAt,
        progress: j.progress != null ? Number(j.progress) : undefined,
        title: j.title
      }));

      return {
        output: { jobs, totalCount: Number(pagination.totalAvailable || 0) },
        message: `Found **${jobs.length}** jobs (${pagination.totalAvailable || 0} total).`
      };
    }

    if (action === 'get') {
      if (!ctx.input.jobId) throw tableauServiceError('jobId is required for get action.');

      let j = await client.getJob(ctx.input.jobId);
      return {
        output: {
          job: {
            jobId: j.id,
            jobType: j.jobType,
            status: j.status,
            createdAt: j.createdAt,
            startedAt: j.startedAt,
            endedAt: j.endedAt,
            progress: j.progress != null ? Number(j.progress) : undefined,
            title: j.title,
            finishCode: j.finishCode != null ? Number(j.finishCode) : undefined
          }
        },
        message: `Job \`${j.id}\` is **${j.status}** (type: ${j.jobType}).`
      };
    }

    if (action === 'cancel') {
      if (!ctx.input.jobId) throw tableauServiceError('jobId is required for cancel action.');

      await client.cancelJob(ctx.input.jobId);
      return {
        output: { cancelled: true },
        message: `Cancelled job \`${ctx.input.jobId}\`.`
      };
    }

    throw tableauServiceError(`Unknown action: ${action}`);
  })
  .build();
