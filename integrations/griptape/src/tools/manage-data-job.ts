import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { paginationSchema } from '../lib/schemas';
import { spec } from '../spec';

const jobSchema = z.object({
  dataJobId: z.string(),
  dataConnectorId: z.string(),
  status: z.string(),
  createdAt: z.string(),
  completedAt: z.string().optional(),
  bytesIngested: z.number().optional(),
  errors: z.array(z.unknown()).optional(),
  statusDetail: z.unknown().optional()
});
const mapJob = (job: Record<string, any>) => ({
  dataJobId: job.data_job_id,
  dataConnectorId: job.data_connector_id,
  status: job.status,
  createdAt: job.created_at,
  completedAt: job.completed_at ?? undefined,
  bytesIngested: job.bytes_ingested,
  errors: job.errors,
  statusDetail: job.status_detail
});

export const manageDataJob = SlateTool.create(spec, {
  name: 'Manage Data Job',
  key: 'manage_data_job',
  description:
    'Refresh an existing Griptape Cloud data source, read or list ingestion jobs, or request cancellation. Call list_data_connectors to discover a data source, then create a job to refresh it before ingesting its documents into a knowledge base.',
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      action: z.enum(['create', 'get', 'list', 'cancel']),
      dataConnectorId: z
        .string()
        .min(1)
        .optional()
        .describe('Required for create and list. Call list_data_connectors to discover IDs.'),
      dataJobId: z
        .string()
        .min(1)
        .optional()
        .describe('Required for get and cancel; returned by create or list.'),
      statusFilter: z
        .array(z.enum(['QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED']))
        .optional(),
      page: z.number().int().min(1).optional(),
      pageSize: z.number().int().min(1).optional()
    })
  )
  .output(
    z.object({
      job: jobSchema.optional(),
      jobs: z.array(jobSchema).optional(),
      pagination: paginationSchema.optional(),
      cancelled: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    if (ctx.input.action === 'create' || ctx.input.action === 'list') {
      if (!ctx.input.dataConnectorId)
        throw createApiServiceError(
          'dataConnectorId is required. Call list_data_connectors to discover IDs.'
        );
      if (ctx.input.action === 'list') {
        const result = await client.listDataJobs(ctx.input.dataConnectorId, {
          page: ctx.input.page,
          pageSize: ctx.input.pageSize,
          status: ctx.input.statusFilter
        });
        return {
          output: { jobs: result.items.map(mapJob), pagination: result.pagination },
          message: `Found ${result.pagination.totalCount} data jobs.`
        };
      }
      const result = await client.createDataJob(ctx.input.dataConnectorId);
      return {
        output: { job: mapJob(result) },
        message: `Started data job ${result.data_job_id}.`
      };
    }
    if (!ctx.input.dataJobId)
      throw createApiServiceError('dataJobId is required for get or cancel.');
    const result =
      ctx.input.action === 'get'
        ? await client.getDataJob(ctx.input.dataJobId)
        : await client.cancelDataJob(ctx.input.dataJobId);
    return {
      output: {
        job: mapJob(result),
        cancelled: ctx.input.action === 'cancel' ? result.status === 'CANCELLED' : undefined
      },
      message: `Data job ${result.data_job_id} is ${result.status}.`
    };
  })
  .build();
