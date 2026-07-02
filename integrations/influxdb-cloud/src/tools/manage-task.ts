import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let taskSchema = z.object({
  taskId: z.string().describe('Unique task ID'),
  name: z.string().describe('Task name'),
  description: z.string().optional().describe('Task description'),
  orgId: z.string().optional().describe('Organization ID'),
  status: z.string().optional().describe('Task status (active or inactive)'),
  flux: z.string().optional().describe('Flux script for the task'),
  every: z.string().optional().describe('Interval schedule (e.g. 1h, 5m)'),
  cron: z.string().optional().describe('Cron schedule expression'),
  offset: z.string().optional().describe('Schedule offset duration'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp'),
  latestCompleted: z.string().optional().describe('Timestamp of last completed run')
});

export let listTasks = SlateTool.create(spec, {
  name: 'List Tasks',
  key: 'list_tasks',
  description: `List all scheduled Flux tasks in the organization. Tasks are scheduled Flux scripts that run on a defined frequency to process, transform, or downsample data.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Filter tasks by name'),
      status: z.enum(['active', 'inactive']).optional().describe('Filter tasks by status'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of tasks to return (default: 100)'),
      offset: z.number().optional().describe('Number of tasks to skip for pagination')
    })
  )
  .output(
    z.object({
      tasks: z.array(taskSchema).describe('List of tasks')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.listTasks({
      name: ctx.input.name,
      status: ctx.input.status,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let tasks = (result.tasks || []).map((t: any) => ({
      taskId: t.id,
      name: t.name,
      description: t.description,
      orgId: t.orgID,
      status: t.status,
      flux: t.flux,
      every: t.every,
      cron: t.cron,
      offset: t.offset,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      latestCompleted: t.latestCompleted
    }));

    return {
      output: { tasks },
      message: `Found **${tasks.length}** task(s).`
    };
  })
  .build();

export let getTask = SlateTool.create(spec, {
  name: 'Get Task',
  key: 'get_task',
  description: `Retrieve details of a specific task by its ID, including the Flux script and scheduling configuration.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      taskId: z.string().describe('ID of the task to retrieve')
    })
  )
  .output(taskSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let t = await client.getTask(ctx.input.taskId);

    return {
      output: {
        taskId: t.id,
        name: t.name,
        description: t.description,
        orgId: t.orgID,
        status: t.status,
        flux: t.flux,
        every: t.every,
        cron: t.cron,
        offset: t.offset,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        latestCompleted: t.latestCompleted
      },
      message: `Retrieved task **${t.name}** (status: ${t.status}).`
    };
  })
  .build();

export let createTask = SlateTool.create(spec, {
  name: 'Create Task',
  key: 'create_task',
  description: `Create a new scheduled Flux task. Provide a Flux script and either a cron expression or an interval schedule.
Common use cases include downsampling, data aggregation, and triggering external actions.`,
  instructions: [
    'Provide either `every` (e.g. "1h", "5m") or `cron` (e.g. "0 * * * *") for scheduling, not both.',
    'The Flux script should include the task options in the script header, or they can be provided as separate parameters.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the task'),
      description: z.string().optional().describe('Description of the task'),
      flux: z.string().describe('Flux script to execute on schedule'),
      status: z
        .enum(['active', 'inactive'])
        .optional()
        .describe('Initial task status (default: active)'),
      every: z
        .string()
        .optional()
        .describe('Interval schedule duration (e.g. "1h", "5m", "30s")'),
      cron: z.string().optional().describe('Cron schedule expression (e.g. "0 * * * *")'),
      offset: z.string().optional().describe('Schedule offset duration')
    })
  )
  .output(taskSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let t = await client.createTask({
      name: ctx.input.name,
      description: ctx.input.description,
      flux: ctx.input.flux,
      status: ctx.input.status,
      every: ctx.input.every,
      cron: ctx.input.cron,
      offset: ctx.input.offset
    });

    return {
      output: {
        taskId: t.id,
        name: t.name,
        description: t.description,
        orgId: t.orgID,
        status: t.status,
        flux: t.flux,
        every: t.every,
        cron: t.cron,
        offset: t.offset,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        latestCompleted: t.latestCompleted
      },
      message: `Created task **${t.name}** (ID: ${t.id}, status: ${t.status}).`
    };
  })
  .build();

export let updateTask = SlateTool.create(spec, {
  name: 'Update Task',
  key: 'update_task',
  description: `Update an existing task's name, description, Flux script, schedule, or status. Can be used to activate/deactivate a task.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      taskId: z.string().describe('ID of the task to update'),
      name: z.string().optional().describe('New name for the task'),
      description: z.string().optional().describe('New description for the task'),
      flux: z.string().optional().describe('New Flux script for the task'),
      status: z.enum(['active', 'inactive']).optional().describe('New task status'),
      every: z.string().optional().describe('New interval schedule duration'),
      cron: z.string().optional().describe('New cron schedule expression'),
      offset: z.string().optional().describe('New schedule offset duration')
    })
  )
  .output(taskSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let t = await client.updateTask(ctx.input.taskId, {
      name: ctx.input.name,
      description: ctx.input.description,
      flux: ctx.input.flux,
      status: ctx.input.status,
      every: ctx.input.every,
      cron: ctx.input.cron,
      offset: ctx.input.offset
    });

    return {
      output: {
        taskId: t.id,
        name: t.name,
        description: t.description,
        orgId: t.orgID,
        status: t.status,
        flux: t.flux,
        every: t.every,
        cron: t.cron,
        offset: t.offset,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        latestCompleted: t.latestCompleted
      },
      message: `Updated task **${t.name}** (ID: ${t.id}).`
    };
  })
  .build();

export let deleteTask = SlateTool.create(spec, {
  name: 'Delete Task',
  key: 'delete_task',
  description: `Permanently delete a scheduled Flux task.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      taskId: z.string().describe('ID of the task to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the task was deleted successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deleteTask(ctx.input.taskId);

    return {
      output: { success: true },
      message: `Deleted task ${ctx.input.taskId}.`
    };
  })
  .build();

export let runTask = SlateTool.create(spec, {
  name: 'Run Task',
  key: 'run_task',
  description: `Manually trigger a task run outside of its normal schedule. Optionally specify a time to simulate the scheduled execution.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      taskId: z.string().describe('ID of the task to run'),
      scheduledFor: z
        .string()
        .optional()
        .describe('Override the scheduled time for the run (RFC3339 format)')
    })
  )
  .output(
    z.object({
      runId: z.string().describe('ID of the triggered run'),
      taskId: z.string().describe('ID of the task'),
      status: z.string().describe('Run status'),
      scheduledFor: z.string().optional().describe('Scheduled execution time')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let run = await client.runTask(ctx.input.taskId, ctx.input.scheduledFor);

    return {
      output: {
        runId: run.id,
        taskId: run.taskID,
        status: run.status,
        scheduledFor: run.scheduledFor
      },
      message: `Triggered run **${run.id}** for task ${ctx.input.taskId}.`
    };
  })
  .build();

export let getTaskRuns = SlateTool.create(spec, {
  name: 'Get Task Runs',
  key: 'get_task_runs',
  description: `List recent runs for a specific task, including their status, scheduled time, and completion details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      taskId: z.string().describe('ID of the task'),
      limit: z.number().optional().describe('Maximum number of runs to return'),
      afterTime: z
        .string()
        .optional()
        .describe('Return runs scheduled after this time (RFC3339)'),
      beforeTime: z
        .string()
        .optional()
        .describe('Return runs scheduled before this time (RFC3339)')
    })
  )
  .output(
    z.object({
      runs: z
        .array(
          z.object({
            runId: z.string().describe('Run ID'),
            taskId: z.string().describe('Task ID'),
            status: z.string().describe('Run status'),
            scheduledFor: z.string().optional().describe('Scheduled execution time'),
            startedAt: z.string().optional().describe('Actual start time'),
            finishedAt: z.string().optional().describe('Finish time'),
            requestedAt: z.string().optional().describe('Time the run was requested')
          })
        )
        .describe('List of task runs')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.getTaskRuns(ctx.input.taskId, {
      limit: ctx.input.limit,
      afterTime: ctx.input.afterTime,
      beforeTime: ctx.input.beforeTime
    });

    let runs = (result.runs || []).map((r: any) => ({
      runId: r.id,
      taskId: r.taskID,
      status: r.status,
      scheduledFor: r.scheduledFor,
      startedAt: r.startedAt,
      finishedAt: r.finishedAt,
      requestedAt: r.requestedAt
    }));

    return {
      output: { runs },
      message: `Found **${runs.length}** run(s) for task ${ctx.input.taskId}.`
    };
  })
  .build();
