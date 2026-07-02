import { SlateTool } from 'slates';
import { z } from 'zod';
import { SeqeraClient } from '../lib/client';
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
      workflowId: z.string().describe('The workflow run ID'),
      includeTasks: z
        .boolean()
        .optional()
        .describe('Include the list of tasks in the run (default false)'),
      includeLog: z.boolean().optional().describe('Include the execution log (default false)'),
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
      baseUrl: ctx.config.baseUrl,
      workspaceId: ctx.config.workspaceId
    });

    let { workflow, progress } = await client.describeWorkflow(ctx.input.workflowId);

    let output: Record<string, any> = {
      workflowId: workflow.id,
      runName: workflow.runName,
      status: workflow.status,
      projectName: workflow.projectName,
      repository: workflow.repository,
      revision: workflow.revision,
      commitId: workflow.commitId,
      userName: workflow.userName,
      workDir: workflow.workDir,
      commandLine: workflow.commandLine,
      start: workflow.start,
      complete: workflow.complete,
      duration: workflow.duration,
      exitStatus: workflow.exitStatus,
      errorMessage: workflow.errorMessage,
      errorReport: workflow.errorReport,
      progress
    };

    if (ctx.input.includeTasks) {
      let taskResult = await client.listWorkflowTasks(ctx.input.workflowId, { max: 100 });
      output.tasks = taskResult.tasks.map(t => ({
        taskId: t.taskId,
        name: t.name,
        process: t.process,
        status: t.status,
        exit: t.exit,
        duration: t.duration,
        cpus: t.cpus,
        memory: t.memory,
        container: t.container,
        executor: t.executor
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
