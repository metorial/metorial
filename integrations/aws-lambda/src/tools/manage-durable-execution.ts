import { SlateTool } from 'slates';
import { z } from 'zod';
import { lambdaServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageDurableExecution = SlateTool.create(spec, {
  name: 'Manage Durable Execution',
  key: 'manage_durable_execution',
  description: `Inspect, list, stop, or send callbacks for Lambda durable executions. Durable executions are long-running, stateful workflows that can be checkpointed and resumed. Supports viewing execution history, state, and sending callback signals for human-in-the-loop patterns.`,
  instructions: [
    'Use **action** to specify: "get", "get_history", "get_state", "list", "stop", "callback_success", "callback_failure", or "callback_heartbeat".',
    'For "list", provide a functionName. For most other actions, provide a durableExecutionArn.',
    'For "get_state", provide checkpointToken.',
    'For callback actions, provide a callbackId.'
  ]
})
  .input(
    z.object({
      action: z
        .enum([
          'get',
          'get_history',
          'get_state',
          'list',
          'stop',
          'callback_success',
          'callback_failure',
          'callback_heartbeat'
        ])
        .describe('Operation to perform'),
      durableExecutionArn: z
        .string()
        .optional()
        .describe('Durable execution ARN (for get/get_history/get_state/stop)'),
      functionName: z.string().optional().describe('Function name (required for list)'),
      callbackId: z
        .string()
        .optional()
        .describe('Callback ID (required for callback actions)'),
      checkpointToken: z
        .string()
        .optional()
        .describe('Checkpoint token required when retrieving durable execution state'),
      callbackResult: z.any().optional().describe('Result payload for callback_success'),
      stopErrorMessage: z
        .string()
        .optional()
        .describe('Error message when stopping execution'),
      stopErrorType: z.string().optional().describe('Error type when stopping execution'),
      statusFilter: z
        .enum(['RUNNING', 'SUCCEEDED', 'FAILED', 'TIMED_OUT', 'STOPPED'])
        .optional()
        .describe('Filter by status (for list)'),
      maxItems: z
        .number()
        .optional()
        .describe('Maximum items to return (for list/get_history)')
    })
  )
  .output(
    z.object({
      durableExecutionArn: z.string().optional().describe('Durable execution ARN'),
      durableExecutionName: z.string().optional().describe('Durable execution name'),
      status: z.string().optional().describe('Execution status'),
      startTimestamp: z.string().optional().describe('Start timestamp'),
      endTimestamp: z.string().optional().describe('End timestamp'),
      inputPayload: z.any().optional().describe('Input payload'),
      result: z.any().optional().describe('Execution result'),
      error: z.any().optional().describe('Execution error'),
      functionArn: z.string().optional().describe('Associated function ARN'),
      history: z.any().optional().describe('Execution history events'),
      state: z.any().optional().describe('Current execution state'),
      executions: z
        .array(
          z.object({
            durableExecutionArn: z.string().optional(),
            durableExecutionName: z.string().optional(),
            status: z.string().optional(),
            startTimestamp: z.string().optional()
          })
        )
        .optional()
        .describe('List of executions'),
      stopTimestamp: z.string().optional().describe('Stop timestamp'),
      callbackSent: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let { action } = ctx.input;

    if (action === 'list') {
      if (!ctx.input.functionName)
        throw lambdaServiceError('functionName is required for list');
      let result = await client.listDurableExecutionsByFunction(
        ctx.input.functionName,
        ctx.input.statusFilter,
        undefined,
        ctx.input.maxItems
      );
      let executions = (result.DurableExecutions || []).map((e: any) => ({
        durableExecutionArn: e.DurableExecutionArn,
        durableExecutionName: e.DurableExecutionName,
        status: e.Status,
        startTimestamp: e.StartTimestamp ? String(e.StartTimestamp) : undefined
      }));
      return {
        output: { executions },
        message: `Found **${executions.length}** durable execution(s) for **${ctx.input.functionName}**.`
      };
    }

    if (action === 'get') {
      if (!ctx.input.durableExecutionArn)
        throw lambdaServiceError('durableExecutionArn is required');
      let result = await client.getDurableExecution(ctx.input.durableExecutionArn);
      return {
        output: {
          durableExecutionArn: result.DurableExecutionArn,
          durableExecutionName: result.DurableExecutionName,
          status: result.Status,
          startTimestamp: result.StartTimestamp ? String(result.StartTimestamp) : undefined,
          endTimestamp: result.EndTimestamp ? String(result.EndTimestamp) : undefined,
          inputPayload: result.InputPayload,
          result: result.Result,
          error: result.Error,
          functionArn: result.FunctionArn
        },
        message: `Durable execution **${result.DurableExecutionName || result.DurableExecutionArn}** is **${result.Status}**.`
      };
    }

    if (action === 'get_history') {
      if (!ctx.input.durableExecutionArn)
        throw lambdaServiceError('durableExecutionArn is required');
      let result = await client.getDurableExecutionHistory(
        ctx.input.durableExecutionArn,
        undefined,
        ctx.input.maxItems
      );
      return {
        output: { history: result },
        message: `Retrieved history for durable execution.`
      };
    }

    if (action === 'get_state') {
      if (!ctx.input.durableExecutionArn)
        throw lambdaServiceError('durableExecutionArn is required');
      if (!ctx.input.checkpointToken)
        throw lambdaServiceError('checkpointToken is required for get_state');
      let result = await client.getDurableExecutionState(
        ctx.input.durableExecutionArn,
        ctx.input.checkpointToken,
        undefined,
        ctx.input.maxItems
      );
      return {
        output: { state: result },
        message: `Retrieved state for durable execution.`
      };
    }

    if (action === 'stop') {
      if (!ctx.input.durableExecutionArn)
        throw lambdaServiceError('durableExecutionArn is required');
      let params: Record<string, any> = {};
      if (ctx.input.stopErrorMessage) params.ErrorMessage = ctx.input.stopErrorMessage;
      if (ctx.input.stopErrorType) params.ErrorType = ctx.input.stopErrorType;
      let result = await client.stopDurableExecution(ctx.input.durableExecutionArn, params);
      return {
        output: {
          stopTimestamp: result.StopTimestamp ? String(result.StopTimestamp) : undefined
        },
        message: `Stopped durable execution.`
      };
    }

    if (action === 'callback_success') {
      if (!ctx.input.callbackId) throw lambdaServiceError('callbackId is required');
      await client.sendDurableExecutionCallbackSuccess(
        ctx.input.callbackId,
        ctx.input.callbackResult
      );
      return {
        output: { callbackSent: true },
        message: `Sent success callback for **${ctx.input.callbackId}**.`
      };
    }

    if (action === 'callback_failure') {
      if (!ctx.input.callbackId) throw lambdaServiceError('callbackId is required');
      await client.sendDurableExecutionCallbackFailure(ctx.input.callbackId);
      return {
        output: { callbackSent: true },
        message: `Sent failure callback for **${ctx.input.callbackId}**.`
      };
    }

    // callback_heartbeat
    if (!ctx.input.callbackId) throw lambdaServiceError('callbackId is required');
    await client.sendDurableExecutionCallbackHeartbeat(ctx.input.callbackId);
    return {
      output: { callbackSent: true },
      message: `Sent heartbeat for callback **${ctx.input.callbackId}**.`
    };
  })
  .build();
