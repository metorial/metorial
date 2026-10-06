import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { paginationSchema } from '../lib/schemas';
import { spec } from '../spec';

export let runStructure = SlateTool.create(spec, {
  name: 'Run Structure',
  key: 'run_structure',
  description: `Create, monitor, and manage structure runs on Griptape Cloud. Structures are custom Python components—pipelines, workflows, or agents—deployed and executed remotely. Use this to trigger new runs, check their status and output, list historical runs, retrieve logs, or cancel active executions.`,
  instructions: [
    'Use "create" to trigger a new structure run with arguments.',
    'Use "get" to check the status and output of a specific run.',
    'Use "list" to browse all runs for a structure.',
    'Use "logs" to retrieve execution logs for debugging.',
    'Use "cancel" to stop an active run.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'list', 'logs', 'cancel'])
        .describe('Operation to perform'),
      structureId: z
        .string()
        .optional()
        .describe('Structure ID (required for create and list)'),
      structureRunId: z
        .string()
        .optional()
        .describe('Run ID (required for get, logs, and cancel)'),
      args: z
        .array(z.string())
        .optional()
        .describe('Arguments for the structure run (for create)'),
      envVars: z
        .array(
          z.object({
            name: z.string().describe('Environment variable name'),
            value: z.string().describe('Environment variable value')
          })
        )
        .optional()
        .describe('Environment variables for the run (for create)'),
      statusFilter: z
        .array(
          z.enum([
            'QUEUED',
            'STARTING',
            'RUNNING',
            'SUCCEEDED',
            'FAILED',
            'ERROR',
            'CANCELLED'
          ])
        )
        .optional()
        .describe('Filter runs by status (for list)'),
      page: z.number().int().min(1).optional().describe('Page number (for list)'),
      pageSize: z.number().int().min(1).optional().describe('Page size (for list)')
    })
  )
  .output(
    z.object({
      structureRunId: z.string().optional().describe('ID of the run'),
      structureId: z.string().optional().describe('ID of the structure'),
      status: z.string().optional().describe('Current status of the run'),
      output: z.any().optional().describe('Output of the run'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      completedAt: z.string().optional().describe('Completion timestamp'),
      runs: z
        .array(
          z.object({
            structureRunId: z.string().describe('Run ID'),
            status: z.string().describe('Run status'),
            createdAt: z.string().describe('Creation timestamp'),
            completedAt: z.string().optional().describe('Completion timestamp')
          })
        )
        .optional()
        .describe('List of runs (for list action)'),
      pagination: paginationSchema.optional().describe('Page navigation metadata'),
      totalCount: z.number().optional().describe('Total runs count (for list action)'),
      logs: z.any().optional().describe('Run logs (for logs action)'),
      cancelled: z.boolean().optional().describe('Whether the run was cancelled')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    if (ctx.input.action === 'create') {
      if (!ctx.input.structureId)
        throw createApiServiceError('structureId is required for create');
      let result = await client.createStructureRun(ctx.input.structureId, {
        args: ctx.input.args ?? [],
        envVars: ctx.input.envVars
      });
      return {
        output: {
          structureRunId: result.structure_run_id,
          structureId: result.structure_id,
          status: result.status,
          output: result.output,
          createdAt: result.created_at,
          completedAt: result.completed_at ?? undefined
        },
        message: `Started structure run **${result.structure_run_id}** with status **${result.status}**.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.structureRunId)
        throw createApiServiceError('structureRunId is required for get');
      let result = await client.getStructureRun(ctx.input.structureRunId);
      return {
        output: {
          structureRunId: result.structure_run_id,
          structureId: result.structure_id,
          status: result.status,
          output: result.output,
          createdAt: result.created_at,
          completedAt: result.completed_at ?? undefined
        },
        message: `Structure run **${result.structure_run_id}** is **${result.status}**.`
      };
    }

    if (ctx.input.action === 'list') {
      if (!ctx.input.structureId)
        throw createApiServiceError('structureId is required for list');
      let result = await client.listStructureRuns(ctx.input.structureId, {
        page: ctx.input.page,
        pageSize: ctx.input.pageSize,
        status: ctx.input.statusFilter
      });
      let runs = result.items.map((r: any) => ({
        structureRunId: r.structure_run_id,
        status: r.status,
        createdAt: r.created_at,
        completedAt: r.completed_at ?? undefined
      }));
      return {
        output: {
          runs,
          pagination: result.pagination,
          totalCount: result.pagination.totalCount
        },
        message: `Found **${result.pagination.totalCount}** run(s) for structure ${ctx.input.structureId}.`
      };
    }

    if (ctx.input.action === 'logs') {
      if (!ctx.input.structureRunId)
        throw createApiServiceError('structureRunId is required for logs');
      let result = await client.listStructureRunLogs(ctx.input.structureRunId);
      return {
        output: { structureRunId: ctx.input.structureRunId, logs: result },
        message: `Retrieved logs for structure run ${ctx.input.structureRunId}.`
      };
    }

    if (ctx.input.action === 'cancel') {
      if (!ctx.input.structureRunId)
        throw createApiServiceError('structureRunId is required for cancel');
      let result = await client.cancelStructureRun(ctx.input.structureRunId);
      return {
        output: {
          structureRunId: ctx.input.structureRunId,
          status: result.status,
          cancelled: result.status === 'CANCELLED'
        },
        message: `Requested cancellation of structure run ${ctx.input.structureRunId}; current status is ${result.status}.`
      };
    }

    throw createApiServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
