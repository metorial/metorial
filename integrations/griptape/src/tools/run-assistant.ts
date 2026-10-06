import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { paginationSchema } from '../lib/schemas';
import { spec } from '../spec';

export let runAssistant = SlateTool.create(spec, {
  name: 'Run Assistant',
  key: 'run_assistant',
  description: `Create and manage runs against a Griptape Cloud assistant. Start a new run with an input prompt, optionally within a thread for conversation continuity. Can also retrieve run status, list runs, or cancel a running execution.`,
  instructions: [
    'Use "create" to start a new assistant run with an input prompt.',
    'Use "get" to check the status and output of an existing run.',
    'Use "list" to see all runs for an assistant, optionally filtered by status.',
    'Use "cancel" to stop a running execution.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'get', 'list', 'cancel']).describe('Operation to perform'),
      assistantId: z
        .string()
        .optional()
        .describe('Assistant ID (required for create and list)'),
      assistantRunId: z.string().optional().describe('Run ID (required for get and cancel)'),
      input: z.string().optional().describe('Input prompt for the assistant (for create)'),
      args: z.array(z.string()).optional().describe('Additional arguments (for create)'),
      threadId: z
        .string()
        .optional()
        .describe('Thread ID for conversation continuity (for create)'),
      newThread: z
        .boolean()
        .optional()
        .describe('Create a new thread for this run (for create)'),
      knowledgeBaseIds: z
        .array(z.string())
        .optional()
        .describe('Override knowledge base IDs (for create)'),
      retrieverIds: z
        .array(z.string())
        .optional()
        .describe('Override retriever IDs (for create)'),
      structureIds: z
        .array(z.string())
        .optional()
        .describe('Override structure IDs (for create)'),
      model: z.string().optional().describe('Override the model (for create)'),
      rulesetIds: z.array(z.string()).optional().describe('Override ruleset IDs (for create)'),
      toolIds: z.array(z.string()).optional().describe('Override tool IDs (for create)'),
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
      assistantRunId: z.string().optional().describe('ID of the run'),
      assistantId: z.string().optional().describe('ID of the assistant'),
      status: z.string().optional().describe('Current status of the run'),
      input: z.string().optional().describe('Input provided to the run'),
      output: z.any().optional().describe('Output of the run (when completed)'),
      threadId: z.string().optional().describe('Thread ID associated with the run'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      completedAt: z.string().optional().describe('Completion timestamp'),
      runs: z
        .array(
          z.object({
            assistantRunId: z.string().describe('Run ID'),
            status: z.string().describe('Run status'),
            input: z.string().optional().describe('Run input'),
            createdAt: z.string().describe('Creation timestamp'),
            completedAt: z.string().optional().describe('Completion timestamp')
          })
        )
        .optional()
        .describe('List of runs (for list action)'),
      pagination: paginationSchema.optional().describe('Page navigation metadata'),
      totalCount: z.number().optional().describe('Total runs count (for list action)'),
      cancelled: z.boolean().optional().describe('Whether the run was cancelled')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    if (ctx.input.action === 'create') {
      if (!ctx.input.assistantId)
        throw createApiServiceError('assistantId is required for create');
      let result = await client.createAssistantRun(ctx.input.assistantId, {
        input: ctx.input.input,
        args: ctx.input.args,
        threadId: ctx.input.threadId,
        newThread: ctx.input.newThread,
        knowledgeBaseIds: ctx.input.knowledgeBaseIds,
        retrieverIds: ctx.input.retrieverIds,
        structureIds: ctx.input.structureIds,
        model: ctx.input.model,
        rulesetIds: ctx.input.rulesetIds,
        toolIds: ctx.input.toolIds
      });
      return {
        output: {
          assistantRunId: result.assistant_run_id,
          assistantId: result.assistant_id,
          status: result.status,
          input: result.input,
          output: result.output,
          threadId: result.thread_id,
          createdAt: result.created_at,
          completedAt: result.completed_at ?? undefined
        },
        message: `Started assistant run **${result.assistant_run_id}** with status **${result.status}**.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.assistantRunId)
        throw createApiServiceError('assistantRunId is required for get');
      let result = await client.getAssistantRun(ctx.input.assistantRunId);
      return {
        output: {
          assistantRunId: result.assistant_run_id,
          assistantId: result.assistant_id,
          status: result.status,
          input: result.input,
          output: result.output,
          threadId: result.thread_id,
          createdAt: result.created_at,
          completedAt: result.completed_at ?? undefined
        },
        message: `Assistant run **${result.assistant_run_id}** is **${result.status}**.`
      };
    }

    if (ctx.input.action === 'list') {
      if (!ctx.input.assistantId)
        throw createApiServiceError('assistantId is required for list');
      let result = await client.listAssistantRuns(ctx.input.assistantId, {
        page: ctx.input.page,
        pageSize: ctx.input.pageSize,
        status: ctx.input.statusFilter
      });
      let runs = result.items.map((r: any) => ({
        assistantRunId: r.assistant_run_id,
        status: r.status,
        input: r.input,
        createdAt: r.created_at,
        completedAt: r.completed_at ?? undefined
      }));
      return {
        output: {
          runs,
          pagination: result.pagination,
          totalCount: result.pagination.totalCount
        },
        message: `Found **${result.pagination.totalCount}** run(s) for assistant ${ctx.input.assistantId}.`
      };
    }

    if (ctx.input.action === 'cancel') {
      if (!ctx.input.assistantRunId)
        throw createApiServiceError('assistantRunId is required for cancel');
      let result = await client.cancelAssistantRun(ctx.input.assistantRunId);
      return {
        output: {
          assistantRunId: ctx.input.assistantRunId,
          status: result.status,
          cancelled: result.status === 'CANCELLED'
        },
        message: `Requested cancellation of assistant run ${ctx.input.assistantRunId}; current status is ${result.status}.`
      };
    }

    throw createApiServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
