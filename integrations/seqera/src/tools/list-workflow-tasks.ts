import { SlateTool } from 'slates';
import { z } from 'zod';
import { SeqeraClient } from '../lib/client';
import { workspaceIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listWorkflowTasks = SlateTool.create(spec, {
  name: 'List Workflow Tasks',
  key: 'list_workflow_tasks',
  description:
    'List a page of tasks for a workflow run, with search, process filtering, and sorting. Call list_workspaces to discover workspace IDs when using a workspace context.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      workspaceId: workspaceIdSchema,
      workflowId: z
        .string()
        .describe('Workflow run ID from list_workflows or launch_workflow'),
      max: z.number().int().min(1).max(100).optional().describe('Page size, up to 100'),
      offset: z.number().int().min(0).optional().describe('Number of tasks to skip'),
      search: z.string().optional().describe('Search tasks by name'),
      process: z.string().optional().describe('Exact Nextflow process name'),
      sortBy: z.string().optional().describe('Task field to sort by'),
      sortDirection: z.enum(['asc', 'desc']).optional()
    })
  )
  .output(
    z.object({
      workflowId: z.string(),
      tasks: z.array(
        z.object({
          taskId: z.number().optional(),
          name: z.string().optional(),
          process: z.string().optional(),
          status: z.string().optional(),
          exit: z.number().optional(),
          duration: z.number().optional(),
          cpus: z.number().optional(),
          memory: z.number().optional(),
          container: z.string().optional(),
          executor: z.string().optional(),
          workDir: z.string().optional()
        })
      ),
      total: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new SeqeraClient({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl ?? ctx.config.baseUrl,
      workspaceId: ctx.input.workspaceId ?? ctx.config.workspaceId
    });
    let result = await client.listWorkflowTasks(ctx.input.workflowId, {
      max: ctx.input.max ?? 50,
      offset: ctx.input.offset,
      search: ctx.input.search,
      process: ctx.input.process,
      sortBy: ctx.input.sortBy,
      sortDir: ctx.input.sortDirection
    });
    return {
      output: {
        workflowId: ctx.input.workflowId,
        total: result.total,
        tasks: result.tasks.map(task => ({
          taskId: task.taskId ?? undefined,
          name: task.name ?? undefined,
          process: task.process ?? undefined,
          status: task.status ?? undefined,
          exit: task.exit ?? undefined,
          duration: task.duration ?? undefined,
          cpus: task.cpus ?? undefined,
          memory: task.memory ?? undefined,
          container: task.container ?? undefined,
          executor: task.executor ?? undefined,
          workDir: task.workdir ?? undefined
        }))
      },
      message: `Found **${result.tasks.length}** tasks for workflow **${ctx.input.workflowId}**.`
    };
  })
  .build();
