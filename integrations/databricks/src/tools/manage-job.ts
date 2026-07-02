import { SlateTool } from 'slates';
import { z } from 'zod';
import { DatabricksClient } from '../lib/client';
import { databricksServiceError } from '../lib/errors';
import { spec } from '../spec';

let taskSchema = z.object({
  taskKey: z.string().describe('Unique key for the task within the job'),
  description: z.string().optional().describe('Task description'),
  dependsOn: z.array(z.string()).optional().describe('Task keys this task depends on'),
  existingClusterId: z.string().optional().describe('ID of an existing cluster to run on'),
  newCluster: z.any().optional().describe('New cluster specification for the task'),
  notebookTask: z
    .object({
      notebookPath: z.string().describe('Workspace path to the notebook'),
      baseParameters: z
        .record(z.string(), z.string())
        .optional()
        .describe('Base parameters for the notebook')
    })
    .optional()
    .describe('Notebook task configuration'),
  sparkPythonTask: z
    .object({
      pythonFile: z.string().describe('URI of the Python file to run'),
      parameters: z.array(z.string()).optional().describe('Command line parameters')
    })
    .optional()
    .describe('Python script task configuration'),
  sqlTask: z.any().optional().describe('SQL task configuration'),
  timeoutSeconds: z.number().optional().describe('Timeout for the task in seconds')
});

export let manageJob = SlateTool.create(spec, {
  name: 'Manage Job',
  key: 'manage_job',
  description: `Create, update, or delete a multi-task workflow job. Supports notebook, Python, and SQL task types with dependencies, scheduling, and notification settings.`,
  instructions: [
    'To create a job, provide a name and at least one task.',
    'Tasks can depend on each other using the dependsOn field referencing other task keys.',
    'To update a job, provide jobId and at least one setting such as name, tasks, schedule, timeoutSeconds, or tags.',
    'To delete a job, provide only the jobId and set action to "delete".'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      jobId: z.string().optional().describe('Job ID (required for update and delete)'),
      name: z.string().optional().describe('Job name (required for create)'),
      tasks: z.array(taskSchema).optional().describe('List of tasks for the job'),
      schedule: z
        .object({
          quartzCronExpression: z.string().describe('Cron expression (e.g., "0 0 * * * ?")'),
          timezoneId: z.string().describe('Timezone ID (e.g., "UTC")'),
          pauseStatus: z
            .enum(['UNPAUSED', 'PAUSED'])
            .optional()
            .describe('Whether the schedule is paused')
        })
        .optional()
        .describe('Schedule configuration'),
      maxConcurrentRuns: z.number().optional().describe('Maximum concurrent runs allowed'),
      timeoutSeconds: z.number().optional().describe('Overall timeout in seconds'),
      tags: z.record(z.string(), z.string()).optional().describe('Tags for the job')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('ID of the created or deleted job')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DatabricksClient({
      workspaceUrl: ctx.config.workspaceUrl,
      token: ctx.auth.token
    });

    if (ctx.input.action === 'delete') {
      if (!ctx.input.jobId) throw databricksServiceError('jobId is required for delete');
      await client.deleteJob(ctx.input.jobId);
      return {
        output: { jobId: ctx.input.jobId },
        message: `Deleted job **${ctx.input.jobId}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.jobId) throw databricksServiceError('jobId is required for update');
      if (
        !ctx.input.name &&
        !ctx.input.tasks &&
        !ctx.input.schedule &&
        ctx.input.maxConcurrentRuns === undefined &&
        ctx.input.timeoutSeconds === undefined &&
        !ctx.input.tags
      ) {
        throw databricksServiceError('At least one job setting is required for update');
      }

      await client.updateJob(ctx.input.jobId, {
        name: ctx.input.name,
        tasks: ctx.input.tasks,
        schedule: ctx.input.schedule,
        maxConcurrentRuns: ctx.input.maxConcurrentRuns,
        timeoutSeconds: ctx.input.timeoutSeconds,
        tags: ctx.input.tags as Record<string, string> | undefined
      });

      return {
        output: { jobId: ctx.input.jobId },
        message: `Updated job **${ctx.input.jobId}**.`
      };
    }

    if (!ctx.input.name || !ctx.input.tasks || ctx.input.tasks.length === 0) {
      throw databricksServiceError('name and at least one task are required for create');
    }

    let result = await client.createJob({
      name: ctx.input.name,
      tasks: ctx.input.tasks,
      schedule: ctx.input.schedule,
      maxConcurrentRuns: ctx.input.maxConcurrentRuns,
      timeoutSeconds: ctx.input.timeoutSeconds,
      tags: ctx.input.tags as Record<string, string> | undefined
    });

    return {
      output: { jobId: String(result.job_id) },
      message: `Created job **${ctx.input.name}** (${result.job_id}) with ${ctx.input.tasks.length} task(s).`
    };
  })
  .build();
