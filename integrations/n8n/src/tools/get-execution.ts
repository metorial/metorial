import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getExecution = SlateTool.create(spec, {
  name: 'Get Execution',
  key: 'get_execution',
  description: `Retrieve details of a specific workflow execution including its status, timing, and optionally the full execution data with node-level results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      executionId: z.string().describe('ID of the execution to retrieve'),
      includeData: z
        .boolean()
        .optional()
        .describe('Include full execution data with node-level results. Defaults to false.')
    })
  )
  .output(
    z.object({
      executionId: z.string().describe('Execution ID'),
      workflowId: z.string().optional().describe('ID of the executed workflow'),
      status: z.string().describe('Execution status'),
      startedAt: z.string().optional().describe('Execution start timestamp'),
      stoppedAt: z.string().optional().describe('Execution end timestamp'),
      finished: z.boolean().optional().describe('Whether the execution finished'),
      mode: z.string().optional().describe('Execution mode'),
      executionData: z
        .any()
        .optional()
        .describe('Full execution data including node results (when includeData is true)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let execution = await client.getExecution(ctx.input.executionId, ctx.input.includeData);

    return {
      output: {
        executionId: String(execution.id),
        workflowId: execution.workflowId ? String(execution.workflowId) : undefined,
        status: execution.status || 'unknown',
        startedAt: execution.startedAt,
        stoppedAt: execution.stoppedAt,
        finished: execution.finished,
        mode: execution.mode,
        executionData: execution.data
      },
      message: `Execution **${execution.id}** has status **${execution.status}**.${execution.startedAt ? ` Started at ${execution.startedAt}.` : ''}${execution.stoppedAt ? ` Stopped at ${execution.stoppedAt}.` : ''}`
    };
  })
  .build();
