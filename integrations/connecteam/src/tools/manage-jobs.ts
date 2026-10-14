import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ConnecteamClient } from '../lib/client';
import { spec } from '../spec';

export let manageJobs = SlateTool.create(spec, {
  name: 'Manage Jobs',
  key: 'manage_jobs',
  description: `Create, retrieve, update, and delete jobs in Connecteam. Jobs are used for scheduling and time tracking. Supports sub-jobs, GPS locations, custom fields, and batch creation (up to 500 per request).`,
  constraints: [
    'Max 500 jobs per batch creation',
    'Job title max 128 characters',
    'Cannot add sub-jobs to a job created without them',
    'Cannot delete parent jobs that have sub-jobs'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'list_jobs',
          'get_job',
          'create_jobs',
          'update_job',
          'delete_job',
          'get_custom_fields'
        ])
        .describe('Job action to perform'),
      jobId: z.string().optional().describe('Job ID (for get_job, update_job, delete_job)'),
      instanceIds: z
        .array(z.number())
        .optional()
        .describe('Filter by scheduler or time clock IDs'),
      jobIds: z.array(z.string()).optional().describe('Filter by job IDs'),
      jobNames: z
        .array(z.string())
        .optional()
        .describe('Filter by job names (case-sensitive)'),
      jobCodes: z.array(z.string()).optional().describe('Filter by job codes'),
      includeDeleted: z.boolean().optional().describe('Include deleted jobs'),
      jobs: z
        .array(z.any())
        .optional()
        .describe(
          'For create_jobs: each job requires title and instanceIds (from list_schedulers or list_time_clocks); a sub-job requires title and parentId.'
        ),
      updateBody: z
        .any()
        .optional()
        .describe(
          'For update_job: an object with required title and optional code, description, gps, color, assign, or customFields.'
        ),
      sort: z.enum(['title']).optional().describe('Sort field'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order'),
      limit: z.number().optional().describe('Results per page (max 500)'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      result: z.any().describe('API response data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConnecteamClient({
      ...ctx.auth,
      baseUrl: ctx.auth.baseUrl ?? (ctx.config as { baseUrl?: string }).baseUrl
    });

    let { action } = ctx.input;

    if (action === 'list_jobs') {
      let result = await client.getJobs({
        instanceIds: ctx.input.instanceIds,
        jobIds: ctx.input.jobIds,
        jobNames: ctx.input.jobNames,
        jobCodes: ctx.input.jobCodes,
        includeDeleted: ctx.input.includeDeleted,
        sort: ctx.input.sort,
        order: ctx.input.order,
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });
      return {
        output: { result },
        message: `Retrieved jobs.`
      };
    }

    if (action === 'get_job') {
      if (!ctx.input.jobId) throw createApiServiceError('jobId is required.');
      let result = await client.getJob(ctx.input.jobId);
      return {
        output: { result },
        message: `Retrieved job **${ctx.input.jobId}**.`
      };
    }

    if (action === 'create_jobs') {
      if (!ctx.input.jobs?.length || ctx.input.jobs.length > 500) {
        throw createApiServiceError('Provide between 1 and 500 jobs to create.');
      }
      if (
        ctx.input.jobs.some(
          job =>
            !job ||
            typeof job.title !== 'string' ||
            (!Array.isArray(job.instanceIds) && typeof job.parentId !== 'string')
        )
      ) {
        throw createApiServiceError(
          'Each job requires title and instanceIds, or title and parentId for a sub-job.'
        );
      }
      let result = await client.createJobs(ctx.input.jobs);
      return {
        output: { result },
        message: `Created **${ctx.input.jobs.length}** job(s).`
      };
    }

    if (action === 'update_job') {
      if (!ctx.input.jobId) throw createApiServiceError('jobId is required.');
      if (typeof ctx.input.updateBody?.title !== 'string') {
        throw createApiServiceError('updateBody.title is required for update_job.');
      }
      let result = await client.updateJob(ctx.input.jobId, ctx.input.updateBody);
      return {
        output: { result },
        message: `Updated job **${ctx.input.jobId}**.`
      };
    }

    if (action === 'delete_job') {
      if (!ctx.input.jobId) throw createApiServiceError('jobId is required.');
      let result = await client.deleteJob(ctx.input.jobId);
      return {
        output: { result },
        message: `Deleted job **${ctx.input.jobId}**.`
      };
    }

    if (action === 'get_custom_fields') {
      let result = await client.getJobCustomFields({
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });
      return {
        output: { result },
        message: `Retrieved job custom fields.`
      };
    }

    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
