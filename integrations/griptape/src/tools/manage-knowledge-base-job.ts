import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { paginationSchema } from '../lib/schemas';
import { spec } from '../spec';

export let manageKnowledgeBaseJob = SlateTool.create(spec, {
  name: 'Manage Knowledge Base Job',
  key: 'manage_knowledge_base_job',
  description: `Trigger a refresh job for a knowledge base, list existing jobs, or check the status of a specific job. Jobs ingest and process data from connected data sources into the knowledge base.`,
  instructions: [
    'Use "create" to trigger a new refresh/ingest job for a knowledge base.',
    'Use "get" to check the status of a specific job.',
    'Use "list" to view all jobs for a knowledge base.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'get', 'list', 'cancel']).describe('Operation to perform'),
      knowledgeBaseId: z
        .string()
        .optional()
        .describe('Knowledge base ID (required for create and list)'),
      knowledgeBaseJobId: z.string().optional().describe('Job ID (required for get)'),
      statusFilter: z
        .array(z.enum(['QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED']))
        .optional()
        .describe('Filter jobs by status (for list)'),
      page: z.number().int().min(1).optional().describe('Page number (for list)'),
      pageSize: z.number().int().min(1).optional().describe('Page size (for list)')
    })
  )
  .output(
    z.object({
      knowledgeBaseJobId: z.string().optional().describe('ID of the job'),
      knowledgeBaseId: z.string().optional().describe('ID of the knowledge base'),
      status: z.string().optional().describe('Current status of the job'),
      cancelled: z.boolean().optional(),
      completedAt: z.string().optional(),
      bytesIngested: z.number().optional(),
      errors: z.array(z.unknown()).optional(),
      statusDetail: z.unknown().optional(),
      createdAt: z.string().optional().describe('Creation timestamp'),
      jobs: z
        .array(
          z.object({
            knowledgeBaseJobId: z.string().describe('Job ID'),
            status: z.string().describe('Job status'),
            createdAt: z.string().describe('Creation timestamp')
          })
        )
        .optional()
        .describe('List of jobs (for list action)'),
      pagination: paginationSchema.optional().describe('Page navigation metadata'),
      totalCount: z.number().optional().describe('Total jobs count (for list action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    if (ctx.input.action === 'create') {
      if (!ctx.input.knowledgeBaseId)
        throw createApiServiceError('knowledgeBaseId is required for create');
      let result = await client.createKnowledgeBaseJob(ctx.input.knowledgeBaseId);
      return {
        output: {
          knowledgeBaseJobId: result.knowledge_base_job_id,
          knowledgeBaseId: result.knowledge_base_id,
          status: result.status,
          completedAt: result.completed_at ?? undefined,
          bytesIngested: result.bytes_ingested,
          errors: result.errors,
          statusDetail: result.status_detail,
          createdAt: result.created_at
        },
        message: `Created knowledge base job **${result.knowledge_base_job_id}** with status **${result.status}**.`
      };
    }

    if (ctx.input.action === 'cancel') {
      if (!ctx.input.knowledgeBaseJobId)
        throw createApiServiceError('knowledgeBaseJobId is required for cancel.');
      let result = await client.cancelKnowledgeBaseJob(ctx.input.knowledgeBaseJobId);
      return {
        output: {
          knowledgeBaseJobId: result.knowledge_base_job_id,
          knowledgeBaseId: result.knowledge_base_id,
          status: result.status,
          cancelled: result.status === 'CANCELLED',
          createdAt: result.created_at,
          completedAt: result.completed_at ?? undefined
        },
        message: `Knowledge base job ${result.knowledge_base_job_id} is ${result.status}.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.knowledgeBaseJobId)
        throw createApiServiceError('knowledgeBaseJobId is required for get');
      let result = await client.getKnowledgeBaseJob(ctx.input.knowledgeBaseJobId);
      return {
        output: {
          knowledgeBaseJobId: result.knowledge_base_job_id,
          knowledgeBaseId: result.knowledge_base_id,
          status: result.status,
          completedAt: result.completed_at ?? undefined,
          bytesIngested: result.bytes_ingested,
          errors: result.errors,
          statusDetail: result.status_detail,
          createdAt: result.created_at
        },
        message: `Knowledge base job **${result.knowledge_base_job_id}** is **${result.status}**.`
      };
    }

    if (ctx.input.action === 'list') {
      if (!ctx.input.knowledgeBaseId)
        throw createApiServiceError('knowledgeBaseId is required for list');
      let result = await client.listKnowledgeBaseJobs(ctx.input.knowledgeBaseId, {
        page: ctx.input.page,
        pageSize: ctx.input.pageSize,
        status: ctx.input.statusFilter
      });
      let jobs = result.items.map((j: any) => ({
        knowledgeBaseJobId: j.knowledge_base_job_id,
        status: j.status,
        createdAt: j.created_at
      }));
      return {
        output: {
          jobs,
          pagination: result.pagination,
          totalCount: result.pagination.totalCount
        },
        message: `Found **${result.pagination.totalCount}** job(s) for knowledge base ${ctx.input.knowledgeBaseId}.`
      };
    }

    throw createApiServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
