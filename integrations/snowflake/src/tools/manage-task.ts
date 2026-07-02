import { SlateTool } from 'slates';
import { z } from 'zod';
import { SnowflakeClient } from '../lib/client';
import { spec } from '../spec';

let taskSchedule = (schedule: string) => {
  let minutes = schedule.match(/^(\d+)\s+MINUTE(S)?$/i);
  if (minutes) {
    return {
      schedule_type: 'MINUTES_TYPE',
      minutes: Number(minutes[1])
    };
  }

  let cron = schedule.match(/^USING\s+CRON\s+(.+)$/i);
  if (cron) {
    return {
      schedule_type: 'CRON_TYPE',
      cron_expr: cron[1]
    };
  }

  return schedule;
};

export let manageTask = SlateTool.create(spec, {
  name: 'Manage Task',
  key: 'manage_task',
  description: `Create, retrieve, list, execute, or delete Snowflake tasks. Tasks schedule SQL statements or stored procedure calls on a recurring basis. Use the **execute** action to manually trigger a task run.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'execute', 'delete'])
        .describe('Operation to perform'),
      databaseName: z.string().describe('Database containing the task'),
      schemaName: z.string().describe('Schema containing the task'),
      taskName: z
        .string()
        .optional()
        .describe('Task name (required for get, create, execute, delete)'),
      like: z.string().optional().describe('SQL LIKE pattern to filter tasks when listing'),
      showLimit: z
        .number()
        .optional()
        .describe('Maximum number of tasks to return when listing'),
      createMode: z
        .enum(['errorIfExists', 'orReplace', 'ifNotExists'])
        .optional()
        .describe('Creation behavior'),
      definition: z
        .string()
        .optional()
        .describe('SQL statement or stored procedure to execute on schedule'),
      schedule: z
        .string()
        .optional()
        .describe('Task schedule (e.g. "5 MINUTE" or a CRON expression)'),
      warehouse: z.string().optional().describe('Warehouse to use for executing the task'),
      condition: z
        .string()
        .optional()
        .describe('WHEN condition that must be true for the task to run'),
      comment: z.string().optional().describe('Task comment'),
      ifExists: z
        .boolean()
        .optional()
        .describe('When true, delete succeeds even if the task does not exist')
    })
  )
  .output(
    z.object({
      tasks: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of tasks (for list action)'),
      task: z
        .record(z.string(), z.any())
        .optional()
        .describe('Task details (for get/create actions)'),
      executed: z.boolean().optional().describe('Whether the task was executed'),
      deleted: z.boolean().optional().describe('Whether the task was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SnowflakeClient({
      accountIdentifier: ctx.config.accountIdentifier,
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType
    });

    let { action, databaseName, schemaName, taskName } = ctx.input;

    if (action === 'list') {
      let tasks = await client.listTasks(databaseName, schemaName, {
        like: ctx.input.like,
        showLimit: ctx.input.showLimit
      });
      return {
        output: { tasks },
        message: `Found **${tasks.length}** task(s) in **${databaseName}.${schemaName}**`
      };
    }

    if (!taskName) {
      throw new Error('taskName is required for get, create, execute, and delete actions');
    }

    if (action === 'get') {
      let task = await client.getTask(databaseName, schemaName, taskName);
      return {
        output: { task },
        message: `Retrieved task **${databaseName}.${schemaName}.${taskName}**`
      };
    }

    if (action === 'create') {
      if (!ctx.input.definition) {
        throw new Error('definition is required to create a task');
      }

      let body: Record<string, any> = {
        name: taskName,
        definition: ctx.input.definition
      };
      if (ctx.input.schedule) body.schedule = taskSchedule(ctx.input.schedule);
      if (ctx.input.warehouse) body.warehouse = ctx.input.warehouse;
      if (ctx.input.condition) body.condition = ctx.input.condition;
      if (ctx.input.comment) body.comment = ctx.input.comment;

      let task = await client.createTask(databaseName, schemaName, body, ctx.input.createMode);
      return {
        output: { task },
        message: `Created task **${databaseName}.${schemaName}.${taskName}**`
      };
    }

    if (action === 'execute') {
      await client.executeTask(databaseName, schemaName, taskName);
      return {
        output: { executed: true },
        message: `Manually executed task **${databaseName}.${schemaName}.${taskName}**`
      };
    }

    if (action === 'delete') {
      await client.deleteTask(databaseName, schemaName, taskName, ctx.input.ifExists);
      return {
        output: { deleted: true },
        message: `Deleted task **${databaseName}.${schemaName}.${taskName}**`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
