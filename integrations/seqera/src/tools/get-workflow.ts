import { SlateTool } from 'slates';
import { z } from 'zod';
import { SeqeraClient } from '../lib/client';
import { workspaceIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getWorkflow = SlateTool.create(spec, {
  name: 'Get Workflow Run',
  key: 'get_workflow',
  description: `Get detailed information about a specific workflow run, including execution status, progress, metrics, and task-level details. Optionally includes the list of tasks and execution log.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: workspaceIdSchema,
      workflowId: z.string().describe('The workflow run ID'),
      includeTasks: z
        .boolean()
        .optional()
        .describe(
          'Include the first 100 tasks (default false). Use list_workflow_tasks to retrieve further pages.'
        ),
      includeLog: z
        .boolean()
        .optional()
        .describe('Include the current page of execution log entries (default false)'),
      includeMetrics: z
        .boolean()
        .optional()
        .describe('Include performance metrics (default false)')
    })
  )
  .output(
    z.object({
      workflowId: z.string().optional().describe('Workflow run ID'),
      runName: z.string().optional().describe('Run name'),
      status: z.string().optional().describe('Run status'),
      projectName: z.string().optional().describe('Pipeline project name'),
      repository: z.string().optional().describe('Pipeline repository URL'),
      revision: z.string().optional().describe('Pipeline revision'),
      commitId: z.string().optional().describe('Git commit ID'),
      userName: z.string().optional().describe('User who launched the run'),
      workDir: z.string().optional().describe('Work directory'),
      commandLine: z.string().optional().describe('Command line used to launch'),
      start: z.string().optional().describe('Run start time'),
      complete: z.string().optional().describe('Run completion time'),
      duration: z.number().optional().describe('Run duration in milliseconds'),
      exitStatus: z.number().optional().describe('Process exit status'),
      errorMessage: z.string().optional().describe('Error message if failed'),
      errorReport: z.string().optional().describe('Detailed error report'),
      progress: z.any().optional().describe('Execution progress details'),
      tasks: z
        .array(
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
            executor: z.string().optional()
          })
        )
        .optional()
        .describe('Tasks in the workflow run'),
      log: z.string().optional().describe('Execution log output'),
      metrics: z.array(z.any()).optional().describe('Performance metrics')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SeqeraClient({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl ?? ctx.config.baseUrl,
      workspaceId: ctx.input.workspaceId ?? ctx.config.workspaceId
    });

    let { workflow, progress } = await client.describeWorkflow(ctx.input.workflowId);

    let output: Record<string, any> = {
      workflowId: workflow.id ?? undefined,
      runName: workflow.runName ?? undefined,
      status: workflow.status ?? undefined,
      projectName: workflow.projectName ?? undefined,
      repository: workflow.repository ?? undefined,
      revision: workflow.revision ?? undefined,
      commitId: workflow.commitId ?? undefined,
      userName: workflow.userName ?? undefined,
      workDir: workflow.workDir ?? undefined,
      commandLine: workflow.commandLine ?? undefined,
      start: workflow.start ?? undefined,
      complete: workflow.complete ?? undefined,
      duration: workflow.duration ?? undefined,
      exitStatus: workflow.exitStatus ?? undefined,
      errorMessage: workflow.errorMessage ?? undefined,
      errorReport: workflow.errorReport ?? undefined,
      progress
    };

    if (ctx.input.includeTasks) {
      let taskResult = await client.listWorkflowTasks(ctx.input.workflowId, { max: 100 });
      output.tasks = taskResult.tasks.map(t => ({
        taskId: t.taskId ?? undefined,
        name: t.name ?? undefined,
        process: t.process ?? undefined,
        status: t.status ?? undefined,
        exit: t.exit ?? undefined,
        duration: t.duration ?? undefined,
        cpus: t.cpus ?? undefined,
        memory: t.memory ?? undefined,
        container: t.container ?? undefined,
        executor: t.executor ?? undefined
      }));
    }

    if (ctx.input.includeLog) {
      output.log = await client.getWorkflowLog(ctx.input.workflowId);
    }

    if (ctx.input.includeMetrics) {
      output.metrics = await client.getWorkflowMetrics(ctx.input.workflowId);
    }

    return {
      output,
      message: `Workflow **${workflow.runName || ctx.input.workflowId}** — Status: **${workflow.status || 'UNKNOWN'}**${workflow.duration ? ` — Duration: ${Math.round(workflow.duration / 1000)}s` : ''}.`
    };
  })
  .build();
