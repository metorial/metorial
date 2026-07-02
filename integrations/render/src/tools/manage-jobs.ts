import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { RenderClient } from '../lib/client';
import { spec } from '../spec';

export let manageJobs = SlateTool.create(spec, {
  name: 'Manage Jobs',
  key: 'manage_jobs',
  description: `Manage Render cron job runs and one-off jobs. **trigger_cron** runs a cron job immediately, **cancel_cron** cancels the currently running cron job run, **create_job** creates a one-off job for a service, **list_jobs** lists one-off jobs for a service, and **cancel_job** cancels a one-off job.`
})
  .input(
    z.object({
      action: z
        .enum([
          'trigger_cron',
          'cancel_cron',
          'create_job',
          'list_jobs',
          'get_job',
          'cancel_job'
        ])
        .describe('Action to perform'),
      serviceId: z
        .string()
        .optional()
        .describe(
          'Service ID (required for one-off job actions; accepted as cronJobId fallback for cron actions)'
        ),
      cronJobId: z
        .string()
        .optional()
        .describe('Cron job ID (required for trigger_cron and cancel_cron)'),
      runId: z
        .string()
        .optional()
        .describe('Deprecated; cancel_cron now cancels the currently running cron job run'),
      jobId: z.string().optional().describe('One-off job ID (for get_job/cancel_job)'),
      startCommand: z.string().optional().describe('Command to run (for create_job)'),
      planId: z.string().optional().describe('Instance plan (for create_job)'),
      status: z
        .enum(['pending', 'running', 'succeeded', 'failed', 'canceled'])
        .optional()
        .describe('Filter list_jobs by status'),
      limit: z.number().optional().describe('Max results (for list_jobs)'),
      cursor: z.string().optional().describe('Pagination cursor (for list_jobs)')
    })
  )
  .output(
    z.object({
      jobId: z.string().optional().describe('Job or run ID'),
      status: z.string().optional().describe('Job/run status'),
      jobs: z
        .array(
          z.object({
            jobId: z.string().describe('Job ID'),
            serviceId: z.string().optional().describe('Service ID'),
            startCommand: z.string().optional().describe('Command'),
            status: z.string().optional().describe('Job status'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .optional()
        .describe('List of jobs (for list_jobs)'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RenderClient(ctx.auth.token);
    let { action } = ctx.input;

    if (action === 'trigger_cron') {
      let cronJobId = ctx.input.cronJobId ?? ctx.input.serviceId;
      if (!cronJobId) throw createApiServiceError('cronJobId is required for trigger_cron');
      let result = await client.triggerCronJobRun(cronJobId);
      return {
        output: { jobId: result.id, status: result.status, success: true },
        message: `Triggered cron job run for cron job \`${cronJobId}\`.`
      };
    }

    if (action === 'cancel_cron') {
      let cronJobId = ctx.input.cronJobId ?? ctx.input.serviceId;
      if (!cronJobId) throw createApiServiceError('cronJobId is required for cancel_cron');
      await client.cancelCronJobRun(cronJobId);
      return {
        output: { jobId: ctx.input.runId, success: true },
        message: `Cancelled the running cron job run for \`${cronJobId}\`.`
      };
    }

    if (action === 'list_jobs') {
      if (!ctx.input.serviceId)
        throw createApiServiceError('serviceId is required for list_jobs');
      let params: Record<string, any> = {};
      if (ctx.input.status) params.status = [ctx.input.status];
      if (ctx.input.limit) params.limit = ctx.input.limit;
      if (ctx.input.cursor) params.cursor = ctx.input.cursor;
      let data = await client.listJobs(ctx.input.serviceId, params);
      let jobs = (data as any[]).map((item: any) => {
        let j = item.job || item;
        return {
          jobId: j.id,
          serviceId: j.serviceId,
          startCommand: j.startCommand,
          status: j.status,
          createdAt: j.createdAt
        };
      });
      return {
        output: { jobs, success: true },
        message: `Found **${jobs.length}** job(s).${jobs.map(j => `\n- \`${j.jobId}\` — ${j.status || 'unknown'}`).join('')}`
      };
    }

    if (action === 'create_job') {
      if (!ctx.input.serviceId)
        throw createApiServiceError('serviceId is required for create_job');
      if (!ctx.input.startCommand)
        throw createApiServiceError('startCommand is required for create_job');
      let body: Record<string, any> = {
        startCommand: ctx.input.startCommand
      };
      if (ctx.input.planId) body.planId = ctx.input.planId;
      let j = await client.createJob(ctx.input.serviceId, body);
      return {
        output: { jobId: j.id, status: j.status, success: true },
        message: `Created one-off job \`${j.id}\` for service \`${ctx.input.serviceId}\`.`
      };
    }

    if (action === 'get_job') {
      if (!ctx.input.serviceId)
        throw createApiServiceError('serviceId is required for get_job');
      if (!ctx.input.jobId) throw createApiServiceError('jobId is required for get_job');
      let j = await client.getJob(ctx.input.serviceId, ctx.input.jobId);
      return {
        output: { jobId: j.id, status: j.status, success: true },
        message: `Job \`${j.id}\` — Status: **${j.status || 'unknown'}**.`
      };
    }

    if (action === 'cancel_job') {
      if (!ctx.input.serviceId)
        throw createApiServiceError('serviceId is required for cancel_job');
      if (!ctx.input.jobId) throw createApiServiceError('jobId is required for cancel_job');
      await client.cancelJob(ctx.input.serviceId, ctx.input.jobId);
      return {
        output: { jobId: ctx.input.jobId, success: true },
        message: `Cancelled job \`${ctx.input.jobId}\`.`
      };
    }

    return { output: { success: false }, message: 'Unknown action.' };
  })
  .build();
