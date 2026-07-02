import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listJobsTool = SlateTool.create(spec, {
  name: 'List Jobs',
  key: 'list_jobs',
  description: `List sync and reset jobs in Airbyte. Filter by connection, job type, status, date range, and workspace. Supports pagination and sorting.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      connectionId: z.string().optional().describe('Filter jobs by connection UUID.'),
      jobType: z.enum(['sync', 'reset']).optional().describe('Filter by job type.'),
      status: z
        .enum(['pending', 'running', 'incomplete', 'failed', 'succeeded', 'cancelled'])
        .optional()
        .describe('Filter by job status.'),
      workspaceIds: z.array(z.string()).optional().describe('Filter jobs by workspace IDs.'),
      createdAtStart: z
        .string()
        .optional()
        .describe('Filter jobs created after this ISO 8601 timestamp.'),
      createdAtEnd: z
        .string()
        .optional()
        .describe('Filter jobs created before this ISO 8601 timestamp.'),
      updatedAtStart: z
        .string()
        .optional()
        .describe('Filter jobs updated after this ISO 8601 timestamp.'),
      updatedAtEnd: z
        .string()
        .optional()
        .describe('Filter jobs updated before this ISO 8601 timestamp.'),
      orderBy: z
        .string()
        .optional()
        .describe('Sort order, e.g. "createdAt|ASC" or "updatedAt|DESC".'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of jobs to return (1-100).'),
      offset: z.number().optional().describe('Offset for pagination.')
    })
  )
  .output(
    z.object({
      jobs: z.array(
        z.object({
          jobId: z.number(),
          status: z.string(),
          jobType: z.string(),
          startTime: z.string(),
          connectionId: z.string(),
          lastUpdatedAt: z.string().optional(),
          duration: z.string().optional(),
          bytesSynced: z.number().optional(),
          rowsSynced: z.number().optional()
        })
      ),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.listJobs({
      connectionId: ctx.input.connectionId,
      jobType: ctx.input.jobType,
      status: ctx.input.status,
      workspaceIds: ctx.input.workspaceIds,
      createdAtStart: ctx.input.createdAtStart,
      createdAtEnd: ctx.input.createdAtEnd,
      updatedAtStart: ctx.input.updatedAtStart,
      updatedAtEnd: ctx.input.updatedAtEnd,
      orderBy: ctx.input.orderBy,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    return {
      output: {
        jobs: result.data.map(j => ({
          jobId: j.jobId,
          status: j.status,
          jobType: j.jobType,
          startTime: j.startTime,
          connectionId: j.connectionId,
          lastUpdatedAt: j.lastUpdatedAt,
          duration: j.duration,
          bytesSynced: j.bytesSynced,
          rowsSynced: j.rowsSynced
        })),
        hasMore: !!result.next
      },
      message: `Found **${result.data.length}** job(s).${result.next ? ' More results available with pagination.' : ''}`
    };
  })
  .build();
