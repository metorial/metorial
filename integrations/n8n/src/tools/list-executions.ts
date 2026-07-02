import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listExecutions = SlateTool.create(spec, {
  name: 'List Executions',
  key: 'list_executions',
  description: `List workflow executions with optional filtering by workflow, status, and project. Returns execution metadata including status, start/end times, and workflow info.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workflowId: z.string().optional().describe('Filter executions by workflow ID'),
      status: z
        .enum(['canceled', 'error', 'running', 'success', 'waiting'])
        .optional()
        .describe('Filter by execution status'),
      projectId: z.string().optional().describe('Filter by project ID'),
      includeData: z
        .boolean()
        .optional()
        .describe('Include full execution data in the response'),
      limit: z.number().optional().describe('Maximum number of executions to return'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      executions: z.array(
        z.object({
          executionId: z.string().describe('Execution ID'),
          workflowId: z.string().optional().describe('ID of the executed workflow'),
          status: z.string().describe('Execution status'),
          startedAt: z.string().optional().describe('Execution start timestamp'),
          stoppedAt: z.string().optional().describe('Execution end timestamp'),
          finished: z.boolean().optional().describe('Whether the execution finished'),
          mode: z.string().optional().describe('Execution mode (manual, trigger, etc.)'),
          retryOf: z
            .string()
            .optional()
            .describe('ID of the original execution if this is a retry')
        })
      ),
      nextCursor: z.string().optional().describe('Cursor for the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let result = await client.listExecutions({
      workflowId: ctx.input.workflowId,
      status: ctx.input.status,
      projectId: ctx.input.projectId,
      includeData: ctx.input.includeData,
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let executions = (result.data || []).map((e: any) => ({
      executionId: String(e.id),
      workflowId: e.workflowId ? String(e.workflowId) : undefined,
      status: e.status || 'unknown',
      startedAt: e.startedAt,
      stoppedAt: e.stoppedAt,
      finished: e.finished,
      mode: e.mode,
      retryOf: e.retryOf ? String(e.retryOf) : undefined
    }));

    return {
      output: {
        executions,
        nextCursor: result.nextCursor
      },
      message: `Found **${executions.length}** execution(s).${result.nextCursor ? ' More results available with pagination cursor.' : ''}`
    };
  })
  .build();
