import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConnecteamClient } from '../lib/client';
import { spec } from '../spec';

let _jobSchema = z.object({
  jobId: z.string().describe('Unique job identifier'),
  title: z.string().describe('Job name'),
  code: z.string().optional().describe('Job code'),
  color: z.string().optional().describe('Hex color'),
  description: z.string().optional().describe('Job description'),
  gps: z
    .object({
      address: z.string().optional(),
      longitude: z.number().optional(),
      latitude: z.number().optional()
    })
    .optional()
    .describe('GPS location'),
  isDeleted: z.boolean().optional(),
  parentId: z.string().optional().nullable(),
  subJobs: z.array(z.any()).optional(),
  instanceIds: z.array(z.number()).optional(),
  customFields: z.array(z.any()).optional()
});

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
      jobs: z.array(z.any()).optional().describe('Array of job objects for create_jobs'),
      updateBody: z.any().optional().describe('Update data for update_job'),
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
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
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
      if (!ctx.input.jobId) throw new Error('jobId is required.');
      let result = await client.getJob(ctx.input.jobId);
      return {
        output: { result },
        message: `Retrieved job **${ctx.input.jobId}**.`
      };
    }

    if (action === 'create_jobs') {
      if (!ctx.input.jobs) throw new Error('jobs array is required.');
      let result = await client.createJobs(ctx.input.jobs);
      return {
        output: { result },
        message: `Created **${ctx.input.jobs.length}** job(s).`
      };
    }

    if (action === 'update_job') {
      if (!ctx.input.jobId) throw new Error('jobId is required.');
      let result = await client.updateJob(ctx.input.jobId, ctx.input.updateBody);
      return {
        output: { result },
        message: `Updated job **${ctx.input.jobId}**.`
      };
    }

    if (action === 'delete_job') {
      if (!ctx.input.jobId) throw new Error('jobId is required.');
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

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
